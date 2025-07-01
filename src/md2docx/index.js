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
import { visit } from 'unist-util-visit';
import { unified } from 'unified';
import remark from 'remark-parse';
import gfm from 'remark-gfm';
import { dereference } from '@adobe/helix-markdown-support';
import { remarkMatter } from '@adobe/helix-markdown-support/matter';
import remarkGridTable from '@adobe/remark-gridtables';
import mdast2docx from '../mdast2docx/index.js';

// 后处理：移除包含图片和换行符的段落包装，如果 <img /><br /> 这种情况
// 会被包装成段落，然后导致后续导出的时候 img 被当做文本导出，所以预处理一下
function postprocessMdast(tree) {
  visit(tree, (node, index, parent) => {
    if (node.type === 'paragraph' && node.children) {
      // 检查是否只包含图片和换行符
      const hasOnlyImageAndBreak = node.children.every(child => 
        (child.type === 'html' && child.value && child.value.trim().startsWith('<br')) ||
        (child.type === 'html' && child.value && child.value.trim().startsWith('<img'))
      );
      
      if (hasOnlyImageAndBreak && node.children.length > 0) {
        // 提取图片节点
        const imageNodes = node.children.filter(child => 
          (child.type === 'html' && child.value && child.value.trim().startsWith('<img'))
        );
        
        if (imageNodes.length === 1) {
          // 替换段落为单个图片节点
          parent.children[index] = imageNodes[0];
        } else if (imageNodes.length > 1) {
          // 如果有多个图片，保持数组形式
          parent.children.splice(index, 1, ...imageNodes);
        }
      }
    }
  });
  return tree;
}


export default async function md2docx(md, opts) {
  const mdast = unified()
    .use(remark, { position: false })
    .use(gfm)
    .use(remarkMatter)
    .use(remarkGridTable)
    .parse(md);

  dereference(mdast);
  postprocessMdast(mdast);
  return mdast2docx({ ...opts, mdast });
}


export async function mdList2docx(mdList, opts) {
  const mdastList = []
  for (const md of mdList) {
    const mdast = unified()
      .use(remark, { position: false })
      .use(gfm)
      .use(remarkMatter)
      .use(remarkGridTable)
      .parse(md);

    dereference(mdast);
    mdastList.push(mdast);
  }

  return mdast2docx({ ...opts, mdastList });
}
