/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { readFile } from 'fs/promises';
import url from 'url';
import path from 'path';
import { Document, Packer, Header, Paragraph, TextRun, AlignmentType } from 'docx';
import { unified } from 'unified';
import remark from 'remark-parse';
import gfm from 'remark-gfm';
import { dereference } from '@adobe/helix-markdown-support';
import { remarkMatter } from '@adobe/helix-markdown-support/matter';
import remarkGridTable from '@adobe/remark-gridtables';

import all from './all.js';
import handlers from './handlers/index.js';
import numbering from './default-numbering.js';
import sanitizeHtml from './mdast-sanitize-html.js';
import { openArrayBuffer } from './zipfile.js';
import { findXMLComponent } from './utils.js';
import downloadImages from './mdast-download-images.js';
import { buildAnchors } from './mdast-docx-anchors.js';

const hasStructuredClone = typeof globalThis.structuredClone === 'function';

const cloneMdastNode = (node) => {
  if (hasStructuredClone) {
    return globalThis.structuredClone(node);
  }
  return JSON.parse(JSON.stringify(node));
};

const cloneMdastNodes = (nodes = []) => nodes.map((item) => cloneMdastNode(item));

const normalizeTemplateSource = (source) => {
  if (typeof source !== 'string') {
    return '';
  }

  const normalizedLineEndings = source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalizedLineEndings.split('\n');

  // 移除首尾完全空白的行，避免引入多余段落
  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  const indentSizes = lines
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const match = line.match(/^(\s+)/);
      return match ? match[0].length : 0;
    });

  const minIndent = indentSizes.length > 0 ? Math.min(...indentSizes) : 0;

  const dedented = minIndent > 0
    ? lines.map((line) => (line.startsWith(' '.repeat(minIndent)) ? line.slice(minIndent) : line))
    : lines;

  const normalized = [];
  let lastLineWasHtml = false;

  dedented.forEach((line) => {
    const trimmedLeft = line.trimStart();
    const trimmed = trimmedLeft.trim();
    const isHeading = trimmedLeft.startsWith('#');

    if (!trimmed) {
      normalized.push('');
      lastLineWasHtml = false;
      return;
    }

    if (isHeading) {
      if (lastLineWasHtml && normalized[normalized.length - 1] !== '') {
        normalized.push('');
      }
      normalized.push(trimmedLeft);
      lastLineWasHtml = false;
      return;
    }

    normalized.push(line);
    lastLineWasHtml = /^<\/?[a-zA-Z]/.test(trimmedLeft);
  });

  return normalized.join('\n').trim();
};

const createTemplateProcessor = () => unified()
  .use(remark, { position: false })
  .use(gfm)
  .use(remarkMatter)
  .use(remarkGridTable);

const createTemplateContext = (baseCtx) => ({
  handlers: baseCtx.handlers,
  style: {},
  paragraphStyle: '',
  images: baseCtx.images,
  listLevel: -1,
  lists: [],
  log: baseCtx.log,
  image2png: baseCtx.image2png,
  resourceLoader: baseCtx.resourceLoader,
  templates: baseCtx.templates,
});

const preprocessTemplates = async (ctx, templatesConfig) => {
  if (!templatesConfig || typeof templatesConfig !== 'object') {
    ctx.templates = {};
    return;
  }

  const entries = Object.entries(templatesConfig).filter(
    ([name, raw]) => typeof name === 'string' && typeof raw === 'string',
  );

  if (entries.length === 0) {
    ctx.templates = {};
    return;
  }

  ctx.templates = {};
  const processor = createTemplateProcessor();

  for (const [name, rawTemplate] of entries) {
    const templateName = name.trim();
    if (!templateName) {
      continue;
    }

    try {
      const templateMarkdown = normalizeTemplateSource(rawTemplate);
      const templateRoot = processor.parse(templateMarkdown);
      dereference(templateRoot);

      const templateCtx = createTemplateContext(ctx);

      sanitizeHtml(templateRoot, templateCtx);
      await downloadImages(templateCtx, templateRoot);
      buildAnchors(templateRoot);

      ctx.templates[templateName] = cloneMdastNodes(templateRoot.children);

      await all(templateCtx, templateRoot);
    } catch (error) {
      ctx.log?.warn?.(`模板 "${templateName}" 处理失败: ${error.message}`);
    }
  }
};

const cmToTwips = (cm) => Math.round((cm / 2.54) * 1440);

/**
 * 将 mdast 转换为 docx
 * @returns {Promise<Buffer>}
 */
export default async function mdast2docx(opts = {}) {
  let {
    log = console,
    resourceLoader,
    image2png,
    pageHeader,
    mdast,
    /** 渲染在文档的第一行，且添加 PageBreakBefore，方便用户打印使用 */
    docxTitle,
    mdastList,
    docxTitleList,
    templates = {},
  } = opts;

  let {
    stylesXML = null,
  } = opts;

  const ctx = {
    handlers,
    style: {},
    paragraphStyle: '',
    images: {},
    listLevel: -1,
    lists: [],
    log,
    image2png,
    resourceLoader,
    templates: {},
  };

  await preprocessTemplates(ctx, templates);

  let children = []
  let childrenList = []

  if (mdastList) {
    // 收集所有文档的图片资源，避免重复下载
    const globalImages = {};

    for (const [index, mdast] of mdastList.entries()) {
      // 为每个文档创建独立的 context，避免状态污染
      const docCtx = {
        handlers,
        style: {},
        paragraphStyle: '',
        images: globalImages, // 共享图片资源，避免重复下载
        listLevel: -1, // 重置列表级别
        lists: [], // 重置列表状态
        log,
        image2png,
        resourceLoader,
        templates: ctx.templates,
      };

      mdastList[index] = sanitizeHtml(mdast, docCtx);
      await downloadImages(docCtx, mdastList[index]);
      buildAnchors(mdastList[index]);
      childrenList.push(await all(docCtx, mdastList[index]));
    }
  } else {
    mdast = sanitizeHtml(mdast, ctx);

    await downloadImages(ctx, mdast);
    buildAnchors(mdast);
    children = await all(ctx, mdast);
  }


  if (!stylesXML) {
    const __dirname = url.fileURLToPath ? path.dirname(url.fileURLToPath(import.meta.url)) : './';
    // read styles from template.docx. this seems to be the most reliable
    const templateDoc = await readFile(path.resolve(__dirname, 'template.docx'));
    const zip = await openArrayBuffer(templateDoc);
    stylesXML = await zip.read('word/styles.xml', 'utf-8');
  }

  const doc = new Document({
    numbering,
    externalStyles: stylesXML,
    sections: [{
      properties: {
        page: {
          margin: {
            top: cmToTwips(1.76),    // 1.76 厘米
            right: cmToTwips(1.76),
            bottom: cmToTwips(1.76),
            left: cmToTwips(1.76),
          },
        },
      },
      headers: pageHeader ? {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: pageHeader,
                  bold: true
                })
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        })
      } : undefined,
      children: !mdastList ? [
        docxTitle && new Paragraph({
          text: docxTitle,
          heading: 'Heading1',
          pageBreakBefore: true,
          alignment: AlignmentType.CENTER
        }),
        ...children,
      ].filter(Boolean) : childrenList.map((children, index) => {
        return [
          docxTitleList[index] && new Paragraph({
            text: docxTitleList[index],
            heading: 'Heading1',
            pageBreakBefore: true,
            alignment: AlignmentType.CENTER
          }),
          ...children,
        ].filter(Boolean)
      }).flat(),
    }],
  });

  // temporary hack for problems with online word
  const cn = doc.numbering.concreteNumberingMap.get('default-bullet-numbering');
  cn.root[0].root.numId = 1;
  cn.numId = 1;

  // temporary hack for problems with lists in online word
  // 移除 docx 默认生成的 w:lvlJc，避免写出不符合规范的 start 值
  for (const nb of doc.numbering.abstractNumberingMap.values()) {
    nb.root.forEach((attr) => {
      if (attr.rootKey !== 'w:lvl') {
        return;
      }
      const jcIdx = attr.root.findIndex((child) => child.rootKey === 'w:lvlJc');
      if (jcIdx !== -1) {
        attr.root.splice(jcIdx, 1);
      }
    });
  }

  let buf = await Packer.toBuffer(doc);
  if (buf instanceof Uint8Array) {
    buf = Buffer.from(buf);
  }
  return buf;
}
