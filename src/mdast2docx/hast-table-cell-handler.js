/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/*
   copied and adapted (adding align) from
   https://github.com/syntax-tree/hast-util-to-mdast/blob/main/lib/handlers/table-cell.js
 */

'use strict';

import { parseStyle } from './mdast-sanitize-html.js';

export default function cell(state, node) {
  const wrap = state.wrapText;

  // eslint-disable-next-line no-param-reassign
  state.wrapText = false;

  const result = {
    type: 'tableCell',
    children: state.all(node),
  };
  state.patch(node, result);

  if (node.properties?.rowSpan || node.properties?.colSpan || node.properties?.align) {
    const data = result.data || (result.data = {});
    if (node.properties.rowSpan) {
      data.rowSpan = node.properties.rowSpan;
    }
    if (node.properties.colSpan) {
      data.colSpan = node.properties.colSpan;
    }
    if (node.properties.align) {
      data.align = node.properties.align;
    }
  }

  // 提取单元格的 style 属性，特别是 width 和 background-color
  if (node.properties?.style) {
    const style = parseStyle(node.properties.style);
    if (style.width) {
      result.width = style.width; // 保存原始宽度字符串（如 "50%", "200px"）
    }
    if (style.backgroundColor) {
      result.backgroundColor = style.backgroundColor; // 保存背景色
    }
  }

  // 提取 bgcolor 属性（HTML 传统属性）
  if (node.properties?.bgcolor) {
    result.backgroundColor = String(node.properties.bgcolor);
  }

  // eslint-disable-next-line no-param-reassign
  state.wrapText = wrap;

  return result;
}
