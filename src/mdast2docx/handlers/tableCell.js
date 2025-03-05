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

export default async function tableCell(ctx, node, parent, siblings) {
  // eslint-disable-next-line no-param-reassign
  node.alignment = ALIGN[node.align || ctx.table.align?.[siblings.length]];
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

  if (parent.tableHeader) {
    // shading for header row
    opts.shading = {
      fill: 'F4CCCD', // color defined in styles.xml (PageBlock table style)
      type: ShadingType.CLEAR,
      color: 'auto',
    };
  }
  return new TableCell(opts);
}
