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
import { visit } from "unist-util-visit";
import { unified } from "unified";
import remark from "remark-parse";
import gfm from "remark-gfm";
import remarkHtml from "remark-html";
import { dereference } from "@adobe/helix-markdown-support";
import { remarkMatter } from "@adobe/helix-markdown-support/matter";
import remarkGridTable from "@adobe/remark-gridtables";
import mdast2docx from "../mdast2docx/index.js";

async function convertTemplatesToHtml(md = "", templates) {
  if (!templates || typeof templates !== "object") {
    return md;
  }
  let replacedMd = md;
  await Promise.all(
    Object.entries(templates).map(async ([name, template]) => {
      if (typeof template === "string") {
        const html = await md2html(template);
        if (replacedMd.indexOf(`{{${name}}}`) !== -1) {
          replacedMd = replacedMd.replace(`{{${name}}}`, html);
        }
      }
    })
  );

  return replacedMd;
}

export default async function md2docx(md, opts = {}) {
  const { templates, ...restOpts } = opts;
  const replacedMd = await convertTemplatesToHtml(md, templates);

  const mdast = unified()
    .use(remark, { position: false })
    .use(gfm)
    .use(remarkMatter)
    .use(remarkGridTable)
    .parse(replacedMd);

  dereference(mdast);
  return mdast2docx({
    ...restOpts,
    mdast,
  });
}

export async function mdList2docx(mdList, opts = {}) {
  const { templates, ...restOpts } = opts;
  const mdastList = [];
  for (const md of mdList) {
    const replacedMd = await convertTemplatesToHtml(md, templates);
    const mdast = unified()
      .use(remark, { position: false })
      .use(gfm)
      .use(remarkMatter)
      .use(remarkGridTable)
      .parse(replacedMd);

    dereference(mdast);
    mdastList.push(mdast);
  }
  return mdast2docx({
    ...restOpts,
    mdastList,
  });
}

export async function md2html(md) {
  const result = await unified()
    .use(remark, { position: false })
    .use(gfm)
    .use(remarkMatter)
    .use(remarkGridTable)
    .use(remarkHtml, { sanitize: false })
    .process(md);

  return result.toString();
}
