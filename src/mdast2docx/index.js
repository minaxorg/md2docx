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


import all from './all.js';
import handlers from './handlers/index.js';
import numbering from './default-numbering.js';
import sanitizeHtml from './mdast-sanitize-html.js';
import { openArrayBuffer } from './zipfile.js';
import { findXMLComponent } from './utils.js';
import downloadImages from './mdast-download-images.js';
import { buildAnchors } from './mdast-docx-anchors.js';




/**
 * 将 mdast 转换为 docx
 * @returns {Promise<Buffer>}
 */
function validateFontSize(value, name) {
  if (value === undefined || value === null) {
    return;
  }
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} 必须是大于 0 的整数（半磅单位，例如 22 = 11pt）`);
  }
}
function applyStyleOptions(stylesXML, styleOptions) {
  let result = stylesXML;
  const { defaultFontSize, headingFontSizes = {} } = styleOptions;

  // 1️⃣ 修改全局默认字号（docDefaults）
  if (defaultFontSize !== undefined) {
    const size = defaultFontSize;
    result = result.replace(
      /(<w:docDefaults>.*?<w:sz w:val=")(\d+)(".*?<\/w:docDefaults>)/s,
      `$1${size}$3`
    );
    result = result.replace(
      /(<w:docDefaults>.*?<w:szCs w:val=")(\d+)(".*?<\/w:docDefaults>)/s,
      `$1${size}$3`
    );

    // 2️⃣ 修改正文 Normal 样式（段落）
    const normalRegex = /(<w:style[^>]*w:type="paragraph"[^>]*w:styleId="Normal"[^>]*>.*?<w:rPr>.*?<w:sz w:val=")(\d+)(".*?<\/w:rPr>.*?<\/w:style>)/s;
    const normalRegexCs = /(<w:style[^>]*w:type="paragraph"[^>]*w:styleId="Normal"[^>]*>.*?<w:rPr>.*?<w:szCs w:val=")(\d+)(".*?<\/w:rPr>.*?<\/w:style>)/s;
    result = result.replace(normalRegex, `$1${size}$3`);
    result = result.replace(normalRegexCs, `$1${size}$3`);

    // 3️⃣ 表格样式 PageBlock
    const pageBlockRegex = /(<w:style[^>]*w:type="table"[^>]*w:styleId="PageBlock"[^>]*>.*?<w:rPr>.*?<w:sz w:val=")(\d+)(".*?<\/w:rPr>.*?<\/w:style>)/s;
    const pageBlockRegexCs = /(<w:style[^>]*w:type="table"[^>]*w:styleId="PageBlock"[^>]*>.*?<w:rPr>.*?<w:szCs w:val=")(\d+)(".*?<\/w:rPr>.*?<\/w:style>)/s;
    result = result.replace(pageBlockRegex, `$1${size}$3`);
    result = result.replace(pageBlockRegexCs, `$1${size}$3`);
  }

  // 4️⃣ 修改或插入标题样式（Heading1 ~ Heading6）
  for (let level = 1; level <= 6; level += 1) {
    const key = `h${level}`;
    const size = headingFontSizes[key];
    if (size === undefined) continue;

    const regex = new RegExp(
      `(<w:style[^>]*w:styleId="Heading${level}"[^>]*>.*?<w:rPr>.*?<w:sz w:val=")(\\d+)(".*?<\\/w:rPr>.*?<\\/w:style>)`,
      "s"
    );
    const regexCs = new RegExp(
      `(<w:style[^>]*w:styleId="Heading${level}"[^>]*>.*?<w:rPr>.*?<w:szCs w:val=")(\\d+)(".*?<\\/w:rPr>.*?<\\/w:style>)`,
      "s"
    );
    result = result.replace(regex, `$1${size}$3`);
    result = result.replace(regexCs, `$1${size}$3`);
  }

  return result;
}


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
    stylesXML = null,
    styleOptions = undefined,
  } = opts;

  const normalizedStyleOptions = {
    defaultFontSize: undefined,
    headingFontSizes: {},
  };

  if (styleOptions && typeof styleOptions === 'object') {
    if (styleOptions.defaultFontSize !== undefined) {
      validateFontSize(styleOptions.defaultFontSize, 'styleOptions.defaultFontSize');
      normalizedStyleOptions.defaultFontSize = styleOptions.defaultFontSize;
    }

    if (styleOptions.headingFontSizes && typeof styleOptions.headingFontSizes === 'object') {
      for (let level = 1; level <= 6; level += 1) {
        const key = `h${level}`;
        if (styleOptions.headingFontSizes[key] === undefined) {
          continue;
        }
        validateFontSize(styleOptions.headingFontSizes[key], `styleOptions.headingFontSizes.${key}`);
        normalizedStyleOptions.headingFontSizes[key] = styleOptions.headingFontSizes[key];
      }
    }
  }

  const hasStyleOverrides = normalizedStyleOptions.defaultFontSize !== undefined
    || Object.keys(normalizedStyleOptions.headingFontSizes).length > 0;

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
  };


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
      };

      mdastList[index] = sanitizeHtml(mdast);
      await downloadImages(docCtx, mdastList[index]);
      buildAnchors(mdastList[index]);
      childrenList.push(await all(docCtx, mdastList[index]));
    }
  } else {
    mdast = sanitizeHtml(mdast);

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

    if (hasStyleOverrides) {
      const newStylesXML = await readFile(path.resolve(__dirname, 'styles.xml'), 'utf-8')
      stylesXML = applyStyleOptions(newStylesXML, normalizedStyleOptions);
    } 
  } else if (hasStyleOverrides) {
    log?.warn?.('同时提供 stylesXML 与 styleOptions，已优先使用 stylesXML，忽略 styleOptions');
  }

  const doc = new Document({
    numbering,
    externalStyles: stylesXML,
    sections: [{
      properties: {
        page: {
          margin: {
            top: '1.76cm',    // 1.76 厘米
            right: '1.76cm',
            bottom: '1.76cm',
            left: '1.76cm',
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
  for (const nb of doc.numbering.abstractNumberingMap.values()) {
    nb.root.forEach((attr) => {
      if (attr.rootKey !== 'w:lvl') {
        return;
      }
      const jc = findXMLComponent(attr, 'w:lvlJc');
      if (jc) {
        const idx = attr.root.indexOf(jc);
        attr.root.splice(idx, 1);
        attr.root.push(jc);
      }
    });
  }

  let buf = await Packer.toBuffer(doc);
  if (buf instanceof Uint8Array) {
    buf = Buffer.from(buf);
  }
  return buf;
}
