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
import { ImageRun } from 'docx';

// 20.99cm - 1.76cm - 1.76cm = 17.47cm = 6.87 英寸
// max image width and height
const LIMITS = {
  width: 914400 * 6.87,
  height: 914400 * 6.87,
};

// max image width (2") and height (1") in tables
const LIMITS_TABLE = {
  width: 914400 * 2.0,
  height: 914400,
};

export default async function image(ctx, node) {
  const { data } = node;
  if (!data) {
    return undefined;
  }

  let x = data.dimensions.width * 9525;
  let y = data.dimensions.height * 9525;
  const limits = ctx.tableAlign ? LIMITS_TABLE : LIMITS;
  if (x > limits.width) {
    y = Math.round((limits.width * y) / x);
    x = limits.width;
  }
  if (y > limits.height) {
    x = Math.round((limits.height * x) / y);
    y = limits.height;
  }

  const options = {
    type: data.dimensions.type || 'png',
    data: data.buffer,
    transformation: {
      width: Math.max(x / 9525, 32),
      height: Math.max(y / 9525, 32),
    },
    altText: {
      title: node.title || '',
      description: node.alt || '',
      name: node.title || node.alt || '',
    },
  };

  if (data.originalType === 'image/svg' || data.originalType === 'image/svg+xml') {
    options.type = 'svg';
    options.data = data.originalBuffer;
    options.fallback = {
      type: data.ext,
      data: data.buffer,
    };
  }

  return new ImageRun(options);
}
