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
import { Paragraph, Table, WidthType ,TableLayoutType} from 'docx';
import all from '../all.js';
import { parseWidthToTwips } from './utils.js';

// see http://officeopenxml.com/WPtableWidth.php
// Note: The 2006 version of the OOXML standard specified that the value was to be a decimal.
// When type="pct", the value was interpreted as fifths of a percent, so 4975=99.5%,
// and no % symbol was included in the attribute. In the 2011 version the value can be either a
// decimal or a percent, so a % symbol should be included when type="pct".


export default async function table(ctx, node) {
  let numCols = node.maxCols;
  if (node.children.length > 0) {
    if (!numCols) {
      numCols = node.children[0].children.length;
    }
  }

  const oldTable = ctx.table;
  // default width: Letter Width - Margin = 8.5" - 2" = 6.5". the unit is 1/1440 inches.
  const tableWidthTwips = oldTable?.columnWidth || 1440 * 6.5;
  ctx.table = {
    width: tableWidthTwips,
    align: node.align || [],
  };

  // 若节点提供了列宽 grid，则优先使用
  let columnWidths;
  let hasWidthStyle = false;
  if (Array.isArray(node.grid) && node.grid.length === numCols) {
    // 直接使用 grid 数组（已经是 twips）
    columnWidths = node.grid.map((w) => Math.max(0, Math.round(w)));
    hasWidthStyle = true;
  } else if (node.gridStr) {
    hasWidthStyle = true;
    // 从 data-grid 属性解析列宽
    const gridValues = node.gridStr.split(',').map((s) => s.trim()).filter(Boolean);
    if (gridValues.length === numCols) {
      columnWidths = gridValues.map((val) => {
        const widthTwips = parseWidthToTwips(val, tableWidthTwips);
        return widthTwips !== null ? Math.max(0, Math.round(widthTwips)) : null;
      });

      // 处理无效值：用均分剩余空间填充
      const validWidths = columnWidths.filter((w) => w !== null);
      const sumValid = validWidths.reduce((acc, w) => acc + w, 0);
      const numInvalid = columnWidths.length - validWidths.length;
      const remain = Math.max(tableWidthTwips - sumValid, 0);
      const baseAuto = numInvalid > 0 ? Math.floor(remain / numInvalid) : 0;

      columnWidths = columnWidths.map((w) => (w !== null ? w : baseAuto));
      // 确保总和不超过表格宽度
      const usedExceptLast = columnWidths.slice(0, -1).reduce((a, b) => a + b, 0);
      columnWidths[columnWidths.length - 1] = Math.max(0, tableWidthTwips - usedExceptLast);
    } else {
      // grid 数量不匹配，回退到单元格宽度
      columnWidths = null;
    }
  }

  if (!columnWidths && node.children.length > 0 && node.children[0].children) {
    // 从第一行的单元格中读取宽度
    const firstRow = node.children[0];
    const cellWidths = firstRow.children.map((cell) => {
      if (cell.width) {
        const widthTwips = parseWidthToTwips(cell.width, tableWidthTwips);
        return widthTwips !== null ? Math.floor(widthTwips) : null;
      }
      return null;
    });

    // 计算显式宽度和自动宽度
    const explicitWidths = cellWidths.filter((w) => w !== null);
    const sumExplicit = explicitWidths.reduce((acc, w) => acc + w, 0);
    const numAuto = cellWidths.length - explicitWidths.length;
    const remain = Math.max(tableWidthTwips - sumExplicit, 0);
    const baseAuto = numAuto > 0 ? Math.floor(remain / numAuto) : 0;

    // 构造列宽数组
    columnWidths = cellWidths.map((w) => (w !== null ? w : baseAuto));
    // 确保总和不超过表格宽度，最后一列用剩余空间
    const usedExceptLast = columnWidths.slice(0, -1).reduce((a, b) => a + b, 0);
    columnWidths[columnWidths.length - 1] = Math.max(0, tableWidthTwips - usedExceptLast);
    if(explicitWidths.length > 0) {
      hasWidthStyle = true;
    }
  } else {
    // 默认均分
    ctx.table.columnWidth = numCols ? (tableWidthTwips / numCols) : tableWidthTwips;
    columnWidths = new Array(numCols).fill(Math.round(ctx.table.columnWidth));
  }

  // process the rows
  const rows = await all(ctx, node);

  ctx.table = oldTable;

  const tbl = new Table({
    style: 'PageBlock',
    rows,
    columnWidths,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    layout: hasWidthStyle ? TableLayoutType.FIXED : TableLayoutType.AUTOFIT,
  });

  // add empty paragraph for better separation in word
  return [tbl, new Paragraph([])];
}
