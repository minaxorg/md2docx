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
import { Bookmark, HeadingLevel, Paragraph } from 'docx';

import all from '../all.js';

const DEPTHS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

export default async function heading(ctx, node, parent) {
  const children = await all(ctx, node);

  if (node.anchor) {
    children.unshift(new Bookmark({
      id: node.anchor,
      children: [],
    }));
  }
  return new Paragraph({
    heading: DEPTHS[node.depth - 1],
    children,
    alignment: parent.alignment,
  });
}
