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
import { Paragraph, Table, AlignmentType } from 'docx';
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

  // 组装段落选项（对齐、缩进、列表、样式）
  const buildParagraphOptions = (paragraphChildren) => {
    const opts = {
      children: paragraphChildren,
      alignment: parent.alignment,
    };

    // 首行缩进
    if (node.style && node.style.textIndent === '2em') {
      opts.indent = {
        firstLine: '22pt'
      };
    }

    // 文本对齐
    if (node.style && node.style.textAlign) {
      const ta = node.style.textAlign;
      if (ta === 'center') {
        opts.alignment = AlignmentType.CENTER;
      } else if (ta === 'right' || ta === 'end') {
        opts.alignment = AlignmentType.END;
      } else if (ta === 'left' || ta === 'start') {
        opts.alignment = AlignmentType.START;
      } else if (ta === 'justify' || ta === 'justified') {
        opts.alignment = AlignmentType.JUSTIFIED;
      } else if (ta === 'distributed' || ta === 'distribute') {
        opts.alignment = AlignmentType.DISTRIBUTE;
      }
    }

    // 列表编号/项目符号与段落样式
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

    return opts;
  };

  // 块/行内拆分：遇到块级（Paragraph/Table）时先输出已累积的行内为段落，再输出块级为兄弟
  const out = [];
  let inlineRuns = [];

  const flushInline = () => {
    if (inlineRuns.length === 0) {
      return;
    }
    const opts = buildParagraphOptions(inlineRuns);
    out.push(new Paragraph(opts));
    inlineRuns = [];
  };

  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if ((child instanceof Paragraph) || (child instanceof Table)) {
      flushInline();
      out.push(child);
    } else {
      inlineRuns.push(child);
    }
  }
  flushInline();

  // 确保至少输出一个空段落，保持结构稳定
  if (out.length === 0) {
    out.push(new Paragraph(buildParagraphOptions([])));
  }

  return out;
}
