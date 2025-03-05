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
import { Paragraph, Table, WidthType } from 'docx';
import all from '../all.js';

function* rowIter(node) {
  for (const child of node.children) {
    if (child.type === 'gtRow') {
      yield child;
    } else {
      for (const grandChild of child.children) {
        yield grandChild;
      }
    }
  }
}

// see http://officeopenxml.com/WPtableWidth.php
// Note: The 2006 version of the OOXML standard specified that the value was to be a decimal.
// When type="pct", the value was interpreted as fifths of a percent, so 4975=99.5%,
// and no % symbol was included in the attribute. In the 2011 version the value can be either a
// decimal or a percent, so a % symbol should be included when type="pct".

export default async function gridTable(ctx, node) {
  let maxCols = 1;

  // need to calculate the number of columns beforehand, for nested tables
  // compute the number of cells in each row, respecting the row and col spans.
  const pendingRowSpans = [];
  for (const row of rowIter(node)) {
    let numCols = pendingRowSpans.shift() || 0;
    for (const cell of row.children) {
      const rowSpan = Number.parseInt(cell.data?.rowSpan || '1', 10);
      const colSpan = Number.parseInt(cell.data?.colSpan || '1', 10);
      numCols += colSpan;
      if (rowSpan > 1) {
        for (let i = 0; i < rowSpan - 1; i += 1) {
          pendingRowSpans[i] = (pendingRowSpans[i] || 0) + colSpan;
        }
      }
    }
    maxCols = Math.max(maxCols, numCols);
  }

  const oldTable = ctx.table;
  ctx.table = {
    // remember the table width
    // default width: Letter Width - Margin = 8.5" - 2" = 6.5". the unit is 1/1440 inches.
    width: oldTable?.columnWidth || 1440 * 6.5,
    align: node.align || [],
  };

  // use the same width for all columns
  ctx.table.columnWidth = maxCols ? (ctx.table.width / maxCols) : ctx.table.width;
  const columnWidths = new Array(maxCols).fill(Math.round(ctx.table.columnWidth));

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
  });

  // add empty paragraph for better separation in word
  return [tbl, new Paragraph([])];
}
