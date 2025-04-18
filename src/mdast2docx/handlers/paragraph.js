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
import { Paragraph } from 'docx';
import all from '../all.js';

export default async function paragraph(ctx, node, parent) {
  // clear style
  ctx.style = {};

  // fix wrong children (todo: do in preprocessor)
  for (let i = 0; i < node.children.length; i += 1) {
    const child = node.children[i];
    if (child.type === 'paragraph') {
      node.children.splice(i, 1, ...child.children);
    }
  }

  const children = await all(ctx, node);
  const opts = {
    children,
    alignment: parent.alignment,
  };

  // 新增代码：判断是否有 style 且 textIndent 为 '2em'
  if (node.style && node.style.textIndent === '2em') {
    opts.indent = {
      firstLine: '22pt' // FIXME: 我看现在默认的段落字体是 11 磅
    };
  }

  if (ctx.listLevel >= 0) {
    const list = ctx.lists[ctx.listLevel];
    if (list.numbering) {
      opts.numbering = {
        reference: list.numbering,
        level: list.level,
        instance: list.instance,
      };
      list.number += 1;
    } else {
      opts.bullet = {
        level: list.level,
      };
    }
  } else if (ctx.paragraphStyle) {
    opts.style = ctx.paragraphStyle;
  }
  return new Paragraph(opts);
}
