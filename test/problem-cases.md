# Problem Case Suite

<!-- Expectation: baseline Markdown renders unchanged -->

## 1. Baseline Markdown

正常段落，上面应该是一个空行。
**粗体**、_斜体_、`行内代码` 都应保持原样。

```js
// 代码块应独立成段
function greet(name) {
  return `Hello, ${name}!`;
}
```

---

<!-- Expectation: table produced from HTML should split into two columns with Markdown parsed in each cell -->

## 2. HTML Table With Markdown Content

<table>
  <tr>
    <td style="width: 50%; background-color: #ddeeff;">
      ### 左列标题
      - 列表项 A
      - 列表项 B
      1. 有序列表 1
      2. 有序列表 2
      ```js
      const left = '代码';
      ```
    </td>
    <td style="width: 50%; background-color: #ffeecc;">
      ### 右列标题
      > 这是引用
      - [x] 任务已完成
      - [ ] 任务未完成
      **粗体** 与 <mark>高亮</mark>
    </td>
  </tr>
</table>

---

<!-- Expectation: paragraph wrapping table splits into separate block; inline styles ignored except alignment -->

## 3. Paragraph Wrapping Table

段落前文，描述如下：

<p>这是段落内嵌表格前的文本。</p>
<table>
  <tr>
    <td><p align="end">右对齐文字</p></td>
    <td><p style="text-indent: 2em;">首行缩进测试</p></td>
  </tr>
</table>
<p>这是段落内嵌表格后的文本。</p>

---

<!-- Expectation: list items containing HTML blocks render as multiple sibling blocks -->

## 4. Lists With Embedded Blocks

1. 第一项
   <table>
     <tr><td>列表内表格</td></tr>
   </table>
   - 嵌套无序列表
   - 仍然存在
2. 第二项包含标题
   <h4>HTML 标题</h4>
   继续说明文本。
3. 第三项
   <blockquote>
     <p>列表内引用内容。</p>
   </blockquote>

---

<!-- Expectation: deeply nested tables remain valid; images & links download/render -->

## 5. Nested Tables And Media

<table>
  <tr>
    <td>
      <p>外层单元格文本。</p>
      <table>
        <tr>
          <td>内层表格单元格 1</td>
          <td><img src="https://via.placeholder.com/80x40.png?text=Img" alt="示例图" /></td>
        </tr>
      </table>
    </td>
    <td>
      <p>包含链接：</p>
      <p><a href="https://example.com">Example 链接</a></p>
    </td>
  </tr>
</table>

---

<!-- Expectation: inline elements containing block HTML are flattened without invalid nesting -->

## 6. Inline Container Holding Block Content

<span>
  <p>Span 内的段落 A。</p>
  <p>Span 内的段落 B。</p>
</span>

---

<!-- Expectation: unsupported CSS (background, width) should be ignored without breaking structure -->

## 7. Unsupported Styles

<p style="background-color: yellow; width: 80%;">段落背景色与宽度应被忽略，只保留文字。</p>
<table>
  <tr>
    <td style="background-color: #ffaaaa;">单元格背景色（当前不支持）</td>
  </tr>
</table>

---

<!-- Expectation: Stress mixed content to ensure splits & rendering stay valid -->

## 8. Stress Mixed Content

段落开始。

<div>
  <h3>HTML 容器标题</h3>
  <p>容器内段落。</p>
  <table>
    <tr>
      <td>
        - 列表项 1
        - 列表项 2
        ```json
        { "key": "value" }
        ```
      </td>
      <td>
        1. 有序 1
        2. 有序 2
        <blockquote>容器内引用</blockquote>
      </td>
    </tr>
  </table>
</div>

段落结尾。

---

<!-- Expectation: template 占位符在段落与表格中被替换为模板内容 -->

## 9. Template Placeholders

以下段落应插入模板 `intro` 的内容：

<p>段落起始。</p>
<template data-template="intro"></template>
<p>段落结束。</p>

下表第二列应渲染模板 `details` 的内容：

<table>
  <tr>
    <td>静态文本</td>
    <td><template data-template="details"></template></td>
  </tr>
</table>
