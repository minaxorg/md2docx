/*
 * Copyright 2020 Adobe. All rights reserved.
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
import parse from 'rehype-parse';
import remarkParse from 'remark-parse';
import { defaultHandlers, toMdast } from 'hast-util-to-mdast';
// import inspect from 'unist-util-inspect';
import tableHandler from './hast-table-handler.js';
import tableCellHandler from './hast-table-cell-handler.js';
import { parseWidthToTwips } from './handlers/utils.js';
/**
 * Creates simple format handler
 * @param type
 */
function formatHandler(type) {
  return (state, node) => {
    const result = { type, children: state.all(node) };
    state.patch(node, result);
    return result;
  };
}

/**
 * @param {State} state
 *   State.
 * @param {Readonly<Element>} node
 *   hast element to transform.
 * @returns {Link}
 *   mdast node.
 */
export function linkHandler(state, node) {
  const properties = node.properties || {};
  // Allow potentially "invalid" nodes, they might be unknown.
  // We also support straddling later.
  const children = /** @type {Array<PhrasingContent>} */ (state.all(node));

  /** @type {Link} */
  const result = {
    type: 'link',
    url: state.resolve(String(properties.href || '') || null),
    title: properties.title ? String(properties.title) : null,
    anchor: properties.name ?? properties.id,
    children,
  };
  state.patch(node, result);
  return result;
}

/**
 * removes paragraphs from the child nodes recursively.
 * @param  node
 */
function unwrapParagraphs(node) {
  if (!node.children) {
    return node;
  }
  for (let idx = 0; idx < node.children.length; idx += 1) {
    const child = node.children[idx];
    if (child.type === 'paragraph') {
      node.children.splice(idx, 1, ...child.children);
      idx += child.children.length - 1;
    } else {
      // eslint-disable-next-line no-param-reassign
      node.children[idx] = unwrapParagraphs(child);
    }
  }
  return node;
}
/**
 * Handler for `<markdown>` elements.
 * @param {[]} mdasts array of mdast sub trees
 */
function mdHandler(mdasts) {
  return (state, node) => {
    const { idx } = node.properties;
    const originalNode = mdasts[+idx];

    // 如果原始节点包含 HTML 内容，需要递归处理
    if (originalNode && (originalNode.type === 'html' || hasHtmlContent(originalNode))) {
      // 创建一个临时的树结构来处理这个节点
      const tempTree = { type: 'root', children: [originalNode] };
      // 递归调用 sanitizeHtml 处理这个节点
      sanitizeHtml(tempTree);
      // 返回处理后的第一个子节点
      return tempTree.children[0];
    }

    return originalNode;
  };
}

/**
 * 检查节点或其子节点是否包含 HTML 内容
 * @param {object} node
 * @returns {boolean}
 */
function hasHtmlContent(node) {
  if (node.type === 'html') {
    return true;
  }

  if (node.children) {
    return node.children.some(child => hasHtmlContent(child));
  }

  return false;
}

function isPhrasingParent(node) {
  return [
    'paragraph',
    'underline',
    'subscript',
    'superscript',
    'heading',
    'emphasis',
    'strong',
    'link',
    'linkReference',
    'tableCell',
    'delete',
    'footnote',
  ].includes(node.type);
}

const FORMATS = {
  '<sub>': {
    closing: '</sub>',
    type: 'subscript',
  },
  '<sup>': {
    closing: '</sup>',
    type: 'superscript',
  },
  '<u>': {
    closing: '</u>',
    type: 'underline',
  },
};

/**
 * Drop trailing initial and final `br`s.
 *
 * @template {Nodes} Node
 *   Node type.
 * @param {Array<Node>} nodes
 *   List of nodes.
 * @returns {Array<Node>}
 *   List of nodes w/o `break`s.
 */
function dropSurroundingBreaks(nodes) {
  let start = 0
  let end = nodes.length

  while (start < end && nodes[start].type === 'break') start++
  while (end > start && nodes[end - 1].type === 'break') end--

  return start === 0 && end === nodes.length ? nodes : nodes.slice(start, end)
}

/**
 * @param {string} styleStr 要转换的 style 字符串
 * @returns {Object} 转换后的 style 对象
 */
export function parseStyle(styleStr) {
  // 解析 style 字符串为对象
  let styleObj = {};
  if (styleStr) {
    const stylePairs = styleStr.split(';').filter(Boolean);
    stylePairs.forEach((pair) => {
      const [key, value] = pair.split(':').map((s) => s.trim());
      if (key && value) {
        // 将 CSS 属性名转换为驼峰命名
        const camelCaseKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        styleObj[camelCaseKey] = value;
      }
    });
  }
  return styleObj;
}

/**
 * @param {State} state
 *   State.
 * @param {Readonly<Element>} node
 *   hast element to transform.
 * @returns {Paragraph | undefined}
 *   mdast node.
 */
export function p(state, node) {
  const children = dropSurroundingBreaks(
    // Allow potentially "invalid" nodes, they might be unknown.
    // We also support straddling later.
    /** @type {Array<PhrasingContent>} */ (state.all(node))
  );

  // 提取节点的 style 属性
  const properties = node.properties || {};
  const styleStr = properties.style ? String(properties.style) : null;
  // 调用 parseStyle 方法将 style 字符串转换为对象
  const style = parseStyle(styleStr);

  // 兼容 <p align="center"> 等写法，将 align 映射到 style.textAlign（left | center | right | justify）
  const alignAttr = properties.align ? String(properties.align).toLowerCase() : null;
  if (alignAttr && !style.textAlign) {
    style.textAlign = alignAttr;
  }

  if (children.length > 0) {
    /** @type {Paragraph} */
    const result = {
      type: 'paragraph',
      children,
      // 添加 style 对象到 mdast 节点
      style
    };
    state.patch(node, result);
    return result;
  }
}

export const handlers = {
  img(state, node) {
    const result = defaultHandlers.img(state, node);
    const properties = node.properties || {};
    const styleStr = properties.style ? String(properties.style) : null;
    const style = parseStyle(styleStr);
    if (Object.keys(style).length > 0) {
      result.style = style;
    }
    return result;
  },
  font(state, node) {
    const properties = node.properties || {};
    const color = properties.color;
    const children = state.all(node);

    if (color && children.length > 0) {
      return {
        type: 'fontColor',
        color: color,
        children: children
      };
    }

    // 如果没有颜色属性，直接返回子节点
    return { type: 'span', children };
  },
  span(state, node) {
    const properties = node.properties || {};
    const styleStr = properties.style ? String(properties.style) : null;
    const style = parseStyle(styleStr);
    const children = state.all(node);

    // 如果有color样式，创建fontColor节点
    if (style.color && children.length > 0) {
      return {
        type: 'fontColor',
        color: style.color,
        children: children
      };
    }

    // 否则返回span节点
    return { type: 'span', children };
  },
  del(state, node) {
    const properties = node.properties || {};
    const styleStr = properties.style ? String(properties.style) : null;
    const style = parseStyle(styleStr);
    const children = state.all(node);

    // 如果有color样式，创建带颜色的删除线节点
    if (style.color && children.length > 0) {
      return {
        type: 'deleteWithColor',
        color: style.color,
        children: children
      };
    }

    // 否则返回普通的删除线节点
    return { type: 'delete', children };
  },
};

/**
 * Sanitizes html:
 * - collapses consecutive html content (simply concat all nodes until the last html sibling)
 * - parses and converts them to mdast again
 *
 * @param {object} tree
 * @returns {object} The modified (original) tree.
 */
export default function sanitizeHtml(tree) {
  const mdInserts = [];

  // 提前预处理一遍，将 <br> 转换为 break
  // 因为下面的操作有合并 html 节点的操作
  // 中间的 markdown 语法的节点中如果再有 <br> 就会被忽略了
  visit(tree, (node, index, parent) => {
    if (node.type === 'html') {
      if (node.value === '<br>' || node.value === '<br/>' || node.value === '<br />') {
        node.type = 'break';
        delete node.value;
      }
    }
  });


  visit(tree, (node, index, parent) => {
    const { children: siblings = [] } = parent || {};

    // collapse html blocks
    if (node.type === 'html') {
      if (node.value === '<br>' || node.value === '<br/>' || node.value === '<br />') {
        // eslint-disable-next-line no-param-reassign
        node.type = 'break';
        // eslint-disable-next-line no-param-reassign
        delete node.value;
        return visit.CONTINUE;
      }

      // try to convert simple formats
      const simple = FORMATS[node.value];
      if (simple) {
        let i = index + 1;
        while (i < siblings.length && siblings[i].type !== 'html' && siblings[i].value !== simple.closing) {
          i += 1;
        }
        if (i < siblings.length && siblings[i].value === simple.closing) {
          const removed = siblings.splice(index + 1, i - index);
          removed.pop();
          // eslint-disable-next-line no-param-reassign
          node.type = simple.type;
          // eslint-disable-next-line no-param-reassign
          node.children = removed;
          // eslint-disable-next-line no-param-reassign
          delete node.value;
          return index + 1;
        }
      }

      // find last html block
      let lastHtml = siblings.length - 1;
      while (lastHtml >= index) {
        if (siblings[lastHtml].type === 'html') {
          break;
        }
        lastHtml -= 1;
      }

      let html = node.value;
      if (lastHtml > index) {
        // remove all html nodes
        const removed = siblings.splice(index + 1, lastHtml - index);


        // and append to html as special markdown element marker which is then handled in the
        // mdHandler for the `<markdown>` elements.
        removed.forEach((n) => {
          if (n.type === 'html' || n.type === 'text') {
            html += n.value;
          } else {
            html += `<markdown idx="${mdInserts.length}">foo</markdown>`;
            mdInserts.push(n);
          }
        });
      }

      if (isPhrasingParent(parent)) {
        html = `<p>${html}</p>`;
      }

      // FIXME：这里在 html 中有 base64 img 时，会很慢
      // try parse html
      const hast = unified()
        .use(parse, { fragment: true })
        .parse(html);

      // convert to mdast with extra handlers
      const mdast = toMdast(hast, {
        document: false,
        handlers: {
          ...defaultHandlers,
          ...handlers,
          a: linkHandler,
          u: formatHandler('underline'),
          sub: formatHandler('subscript'),
          sup: formatHandler('superscript'),
          table: tableHandler,
          markdown: mdHandler(mdInserts),
          th: tableCellHandler,
          td: tableCellHandler,
          // 添加 p 标签的处理函数
          p,
        },
      });
      // clear inserts
      mdInserts.length = 0;

      // 对 HTML 转换后的 mdast，进行一次"行内 Markdown"二次解析（白名单父节点）
      // 策略：只对纯文本节点进行 Markdown 解析，保留已转换的 HTML 节点（fontColor、deleteWithColor 等）
      // 参考 mdast PhrasingContent 规范：https://github.com/syntax-tree/mdast#phrasingcontent
      const INLINE_PARENTS = new Set([
        // 标准 mdast 行内节点（PhrasingContent）
        'paragraph','emphasis','strong','delete','inlineCode',
        'link','linkReference','image','imageReference',
        'break','footnote','footnoteReference',
        // HTML 扩展节点
        'underline','subscript','superscript','span',
        // 自定义节点
        'fontColor','deleteWithColor',
        // 特殊容器节点（需要行内解析）
        'tableCell'
      ]);

      function parseInlineMarkdown(textValue) {
        try {
          const tree = unified().use(remarkParse).parse(String(textValue || ''));
          // 仅取第一个段落的 children 作为行内内容；否则退回原文本
          const para = Array.isArray(tree.children) ? tree.children.find((n) => n.type === 'paragraph') : null;
          return para && Array.isArray(para.children) && para.children.length > 0
            ? para.children
            : [{ type: 'text', value: String(textValue || '') }];
        } catch (_) {
          return [{ type: 'text', value: String(textValue || '') }];
        }
      }
      function parseBlockMarkdown(textValue) {
        try {
          const tree = unified().use(remarkParse).parse(String(textValue || ''));
          // 返回所有解析结果（包括列表、代码块、引用等所有块级语法）
          return Array.isArray(tree.children) ? tree.children : [];
        } catch (_) {
          return [{ type: 'text', value: String(textValue || '') }];
        }
      }
      visit(mdast, (n, i, p) => {
        if (!p || !Number.isInteger(i)) return visit.CONTINUE;
        // 只处理纯文本节点，跳过已转换的节点（fontColor、deleteWithColor、span 等）
        if (n.type !== 'text') return visit.CONTINUE;

        // 行内父节点：仅解析行内 Markdown
        if (INLINE_PARENTS.has(p.type)) {
          const inlines = parseInlineMarkdown(n.value);
          p.children.splice(i, 1, ...inlines);
          return i + inlines.length;
        }

        // 非行内父节点：解析所有块级 Markdown（包括列表、代码块、引用等）
        const blocks = parseBlockMarkdown(n.value);
        if (blocks.length > 0) {
          p.children.splice(i, 1, ...blocks);
          return i + blocks.length;
        }

        return visit.CONTINUE;
      });

      // ensure that flow nodes are in phrasing context
      if (!isPhrasingParent(parent)) {
        let lastParagraph;
        for (let idx = 0; idx < mdast.children.length; idx += 1) {
          const child = mdast.children[idx];
          if (child.type === 'underline' || child.type === 'subscript' || child.type === 'superscript') {
            unwrapParagraphs(child);
            if (!lastParagraph) {
              lastParagraph = {
                type: 'paragraph',
                children: [child],
              };
              mdast.children.splice(idx, 1, lastParagraph);
            } else {
              lastParagraph.children.push(child);
              mdast.children.splice(idx, 1);
              idx -= 1;
            }
          } else {
            lastParagraph = null;
          }
        }
      } else {
        unwrapParagraphs(mdast);
      }

      // inject children of parsed tree
      siblings.splice(index, 1, ...mdast.children);

      // continue after
      return index + mdast.children.length;
    }

    return visit.CONTINUE;
  });

  // 后处理：为 root 下连续的 inline-block 段落计算 frame 布局（width/x，单位 twips）
  // 根据实际页面设置计算可用宽度：
  // - 默认 Word A4 页面宽度：21cm = 8.267 英寸 = 11907 twips
  // - 页边距（与 index.js 保持一致）：左右各 1.76cm = 0.693 英寸 = 998 twips
  // - 可用宽度：(21cm - 1.76cm*2) = 17.48cm = 6.88 英寸 = 9907 twips
  // 参考 image.js：实际测量为 20.99cm - 1.76cm*2 = 17.47cm = 6.87 英寸
  // 使用 17.47cm 转换为 twips：17.47 * 566.93 ≈ 9907 twips（更精确）
  const PAGE_WIDTH_CM = 20.99; // A4 实际宽度（参考 image.js）
  const MARGIN_CM = 2; // 左右页边距（与 index.js 保持一致）
  const AVAILABLE_WIDTH_CM = PAGE_WIDTH_CM - (MARGIN_CM * 2);
  const AVAILABLE_TWIPS = Math.floor(AVAILABLE_WIDTH_CM * 566.93); // cm 转 twips



  function isInlineBlockParagraph(n) {
    return n && n.type === 'paragraph' && n.style && n.style.display === 'inline-block';
  }

  // 处理某个父节点下的连续 inline-block 段落
  function processInlineBlockGroups(siblings) {
    if (!Array.isArray(siblings)) return;

    let i = 0;
    while (i < siblings.length) {
      if (!isInlineBlockParagraph(siblings[i])) {
        i += 1;
        continue;
      }
      const group = [];
      let j = i;
      while (j < siblings.length && isInlineBlockParagraph(siblings[j])) {
        group.push(siblings[j]);
        j += 1;
      }
      if (group.length >= 2) {
        // 先扣除列间距，再进行宽度计算
        const SPACING_TWIPS = 50; // 列间距（仅用于视觉参考，表格会自然对齐）
        const spacingTotal = SPACING_TWIPS * (group.length - 1);
        const availableForCols = Math.max((AVAILABLE_TWIPS - spacingTotal), 0);

        // 计算每个的宽度（显式优先，否则均分剩余）
        const explicitWidths = group.map((n) => {
          const width = parseWidthToTwips(n.style && n.style.width, availableForCols);
          return width !== null ? Math.floor(width) : null;
        });

        const sumExplicit = explicitWidths.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
        const numAuto = explicitWidths.filter((v) => !Number.isFinite(v)).length;
        const remain = Math.max(availableForCols - sumExplicit, 0);
        const baseAuto = numAuto > 0 ? Math.floor(remain / numAuto) : 0;

        const totalWidth = sumExplicit + (baseAuto * numAuto);
        let scale = 1;
        if (totalWidth > availableForCols && totalWidth > 0) {
          scale = availableForCols / totalWidth;
        }

        const widths = new Array(group.length).fill(0);
        for (let k = 0; k < group.length; k += 1) {
          widths[k] = Number.isFinite(explicitWidths[k])
            ? Math.floor(explicitWidths[k] * scale)
            : Math.floor(baseAuto * scale);
        }
        const usedExceptLast = widths.slice(0, -1).reduce((a, b) => a + b, 0);
        widths[widths.length - 1] = Math.max(0, availableForCols - usedExceptLast);

        // 构造单行表格：每列一个单元格，承载原段落
        const tableRow = {
          type: 'tableRow',
          children: group.map((colNode, idx) => ({
            type: 'tableCell',
            widthTwips: widths[idx],
            children: [colNode],
          })),
        };

        const tableNode = {
          type: 'table',
          align: [],
          children: [tableRow],
          grid: widths,
          noHeader: true,
        };

        // 用表格替换该分组
        siblings.splice(i, j - i, tableNode);
        i = i + 1;
        continue;
      }
      i = j;
    }
  }

  // 只处理段落内的 inline-block 子段落，不处理根节点下的 inline-block 段落
  // 检查条件：父节点必须是段落（嵌套在段落内），且该节点包含 inline-block 子段落
  visit(tree, (node, index, parent) => {
    // 只处理段落节点，且父节点必须是段落（不是 root）
    if (node.type !== 'paragraph' ) {
      return visit.CONTINUE;
    }
    // 检查这个段落内的子节点中是否有 inline-block 段落
    if (!node.children || !Array.isArray(node.children)) {
      return visit.CONTINUE;
    }

    const hasInlineBlock = node.children.some((child) => isInlineBlockParagraph(child));
    if (hasInlineBlock) {
      processInlineBlockGroups(node.children);
    }

    return visit.CONTINUE;
  });

  // 确保根节点下的兄弟段落也参与并排计算（例如直接写了多个 inline-block 段落）
  if (tree && Array.isArray(tree.children)) {
    const hasRootInlineBlock = tree.children.some((child) => isInlineBlockParagraph(child));
    if (hasRootInlineBlock) {
      processInlineBlockGroups(tree.children);
    }
  }

  return tree;
}
