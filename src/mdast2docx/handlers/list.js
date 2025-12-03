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
import all from '../all.js';

export default async function list(ctx, node) {
  const { ordered, start } = node;
  ctx.listLevel += 1;
  let lst = ctx.lists[ctx.listLevel];

  // 如果该层级已有列表，说明是新列表，需要创建新的 instance 并重置编号
  const docIndex = ctx.docIndex || 0; // 获取文档索引，默认为 0（单文档模式）
  const instanceBase = docIndex * 10000; // 每个文档使用 10000 的偏移量
  if (lst) {
    lst.instance += 1;
    lst.number = start || 1;
  } else {
    // 首次创建该层级的列表
    lst = {
      level: ctx.listLevel,
      number: start || 1,
      instance: instanceBase + 1, // 使用文档偏移量
    };
    ctx.lists[ctx.listLevel] = lst;
  }
  if (ordered) {
    lst.numbering = 'default-numbering';
  } else {
    lst.numbering = 'default-bullets';
  }

  const children = await all(ctx, node);
  ctx.listLevel -= 1;
  return children;
}
