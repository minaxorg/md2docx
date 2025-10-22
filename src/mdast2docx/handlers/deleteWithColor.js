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

// 常见颜色名称到十六进制的映射
const COLOR_NAMES = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '008000',
  blue: '0000FF',
  yellow: 'FFFF00',
  cyan: '00FFFF',
  magenta: 'FF00FF',
  orange: 'FFA500',
  purple: '800080',
  pink: 'FFC0CB',
  brown: 'A52A2A',
  gray: '808080',
  grey: '808080',
  lime: '00FF00',
  navy: '000080',
  teal: '008080',
  silver: 'C0C0C0',
  maroon: '800000',
  olive: '808000',
};

/**
 * 将颜色值转换为 6 位十六进制格式
 * @param {string} color - 颜色值（可以是颜色名称或十六进制）
 * @returns {string|null} 6 位十六进制颜色值
 */
function normalizeColor(color) {
  if (!color) {
    return null;
  }

  const colorLower = color.toLowerCase().trim();

  // 如果是颜色名称，转换为十六进制
  if (COLOR_NAMES[colorLower]) {
    return COLOR_NAMES[colorLower];
  }

  // 移除 # 号
  let hex = color.replace('#', '');

  // 如果是 3 位十六进制，扩展为 6 位
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  // 验证是否为有效的 6 位十六进制
  if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
    return hex.toUpperCase();
  }

  return null;
}

/**
 * Handler for delete nodes with color (created from <del style="color: ..."> tags)
 * @param {object} ctx - context
 * @param {object} node - mdast node with color property
 * @returns {Array} array of TextRun objects with strike and color applied
 */
export default async function deleteWithColor(ctx, node) {
  const { color } = node;

  // 标准化颜色值
  const normalizedColor = normalizeColor(color);

  // 设置删除线样式
  ctx.style.strike = true;

  // 将颜色添加到 context style 中
  if (normalizedColor) {
    ctx.style.color = normalizedColor;
  }

  // 处理子节点
  const result = await all(ctx, node);

  // 清理 context style
  ctx.style.strike = false;
  if (normalizedColor) {
    delete ctx.style.color;
  }

  return result;
}
