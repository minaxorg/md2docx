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
import { Paragraph, TextRun } from 'docx';

export default function html(ctx, node, parent) {
  if (node.value === '<!---->') {
    // ignore
    return undefined;
  }
  // should not occur...just create text
  const text = new TextRun({
    color: 'ff0000',
    text: node.value,
  });

  if (parent.type === 'paragraph') {
    return text;
  }
  return new Paragraph({
    children: [
      text,
    ],
  });
}
