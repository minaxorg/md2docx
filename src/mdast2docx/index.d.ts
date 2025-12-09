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

import type { RequestOptions, Response } from '@adobe/helix-fetch';
import type { Root } from 'mdast';
import type { SectionType } from 'docx';

declare interface ImageToPngOptions {
  /**
   * image data
   */
  data:Buffer|ArrayBuffer;
  /**
   * informational src information
   */
  src?:string;
  /**
   * image content type, if available.
   */
  type?:string;
}

declare interface ImageToPngResult {
  data:Buffer|ArrayBuffer;
  type?:string;
  width:number;
  height:number;
}

declare type ImageToPngConverter = (opts:ImageToPngOptions) => Promise<ImageToPngResult>;

/**
 * Loader used for loading resources for urls starting with `res:`
 */
declare interface ResourceLoader {
  fetch(url: string, opts: RequestOptions): Promise<Response>
}

declare interface Mdast2DocxOptions {
  /**
   * A console like logger
   */
  log?: Console;

  /**
   * The content of the styles.xml file of a Word template (to override provided default)
   */
  stylesXML?: string | null;

  /**
   * Optional loader for (image) resources
   */
  resourceLoader?: ResourceLoader;

  /**
   * Optional image2png converter
   */
  image2png?: ImageToPngConverter

  /**
   * 给每一页新增一个居中显示的页眉文字
   */
  pageHeader?: string;

  /**
   * 单个文档的 mdast 根节点
   */
  mdast?: Root;

  /**
   * 文档标题，会作为 Heading1 插入，并添加分页
   */
  docxTitle?: string;

  /**
   * 多文档模式下的 mdast 列表
   */
  mdastList?: Root[];

  /**
   * 多文档模式下的标题列表，应与 mdastList 对应
   */
  docxTitleList?: string[];

  /**
   * Markdown 模板集合，键为模板名称，值为 Markdown 字符串
   */
  templates?: Record<string, string>;

  /**
   * 样式配置（可逐步扩展）
   */
  styleOptions?: {
    /**
     * 默认字体大小（半磅单位，例如 22 = 11pt）
     */
    defaultFontSize?: number

    /**
     * 标题字体大小配置（半磅单位，例如 40 = 20pt）
     */
    headingFontSizes?: {
      h1?: number
      h2?: number
      h3?: number
      h4?: number
      h5?: number
      h6?: number
    }
  }

  /**
   * 多文档模式下的分节符类型
   * 可选值：
   * - SectionType.CONTINUOUS: 连续分节（不分页，在同一页继续）
   * - SectionType.NEXT_PAGE: 下一页分节（强制分页到下一页）
   * - SectionType.NEXT_COLUMN: 下一列分节（用于分栏布局）
   * - SectionType.ODD_PAGE: 奇数页分节（默认，分页到下一个奇数页）
   * - SectionType.EVEN_PAGE: 偶数页分节（分页到下一个偶数页）
   *
   * 默认值：SectionType.ODD_PAGE
   */
  sectionType?: SectionType
}

/**
 * Converts the mdast to a word document (docx).
 *
 * @param {Node} mdast The mdast
 * @param {Mdast2DocxOptions} [opts] options
 * @returns {Promise<Buffer>} the docx
 */
export default function mdast2docx(opts: Mdast2DocxOptions): Promise<Buffer>;
