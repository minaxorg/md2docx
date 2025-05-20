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
  };

  let children = []
  let childrenList = []

  if (mdastList) {
    for (const [index, mdast] of mdastList.entries()) {
      mdastList[index] = sanitizeHtml(mdast);
      await downloadImages(ctx, mdastList[index]);
      buildAnchors(mdastList[index]);
      childrenList.push(await all(ctx, mdastList[index]));
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
