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

/**
 * Handler for span nodes (created from <font> tags without color attribute or <span> tags)
 * @param {object} ctx - context
 * @param {object} node - mdast node
 * @returns {Array} array of processed child nodes
 */
export default async function span(ctx, node) {
  // 处理子节点，span本身不添加任何样式，只是作为容器
  return await all(ctx, node);
}
