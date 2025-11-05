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
import {
  AlignmentType, Paragraph, Table, TableCell, ShadingType, VerticalAlign,
} from 'docx';
import all from '../all.js';
import { removeUndefined } from '../utils.js';

const ALIGN = {
  left: null,
  right: AlignmentType.RIGHT,
  center: AlignmentType.CENTER,
  justify: AlignmentType.JUSTIFIED,
  distribute: AlignmentType.DISTRIBUTE,
};

const V_ALIGN = {
  top: VerticalAlign.TOP,
  middle: VerticalAlign.CENTER,
  bottom: VerticalAlign.BOTTOM,
};

// 将 CSS 颜色转换为 DOCX 格式（RRGGBB，无 #）
function parseColor(colorStr) {
  if (!colorStr) return null;
  const s = String(colorStr).trim();

  // 移除 # 号
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    // 3 位十六进制（如 #FFF）转为 6 位
    if (hex.length === 3) {
      return hex.split('').map((c) => c + c).join('').toUpperCase();
    }
    // 6 位十六进制
    if (hex.length === 6) {
      return hex.toUpperCase();
    }
    return null;
  }

  // RGB/RGBA 格式：rgb(255, 0, 0) 或 rgba(255, 0, 0, 0.5)
  const rgbMatch = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = Number.parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
    const g = Number.parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
    const b = Number.parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
    return (r + g + b).toUpperCase();
  }

  // 常见颜色名称映射（简化版，可根据需要扩展）
  const namedColors = {
    red: 'FF0000',
    green: '00FF00',
    blue: '0000FF',
    yellow: 'FFFF00',
    cyan: '00FFFF',
    magenta: 'FF00FF',
    black: '000000',
    white: 'FFFFFF',
    gray: '808080',
    grey: '808080',
  };
  if (namedColors[s.toLowerCase()]) {
    return namedColors[s.toLowerCase()];
  }

  return null;
}

export default async function tableCell(ctx, node, parent, siblings) {
  // eslint-disable-next-line no-param-reassign
  node.alignment = ALIGN[node.align || ctx.table?.align?.[siblings.length]] || null;
  const children = await all(ctx, node);

  const content = [];
  let leaves = [];
  // wrap non block elements with paragraph
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if ((child instanceof Paragraph) || (child instanceof Table)) {
      if (leaves.length) {
        content.push(new Paragraph({ alignment: node.alignment, children: leaves }));
      }
      content.push(child);
      leaves = [];
    } else {
      leaves.push(child);
    }
  }
  if (leaves.length) {
    content.push(new Paragraph({ alignment: node.alignment, children: leaves }));
  }

  const opts = removeUndefined({
    children: content,
    verticalAlign: V_ALIGN[node.valign],
    columnSpan: node.data?.colSpan ?? node.colSpan,
    rowSpan: node.data?.rowSpan ?? node.rowSpan,
  });

  // 设置单元格背景色：优先使用单元格的 backgroundColor，否则使用表头默认色
  if (node.backgroundColor) {
    // 将 CSS 颜色转换为 DOCX 格式（RRGGBB，无 #）
    const color = parseColor(node.backgroundColor);
    if (color) {
      opts.shading = {
        fill: color,
        type: ShadingType.CLEAR,
        color: 'auto',
      };
    }
  } else if (parent.tableHeader) {
    // shading for header row (默认表头背景色)
    opts.shading = {
      fill: 'F4CCCD', // color defined in styles.xml (PageBlock table style)
      type: ShadingType.CLEAR,
      color: 'auto',
    };
  }
  return new TableCell(opts);
}
