# md2docx 测试套件

本目录包含 md2docx 库的测试文件和测试脚本。

## 快速开始

**运行所有测试（推荐）：**

```bash
node test/run-all-tests.js
```

这会依次运行：

1. 功能测试套件（15 个测试用例）
2. 现有文件测试（testfont.md、testLayout.md、test.md）

所有输出文件统一保存在 `test/output/` 目录。

## 测试脚本

### 1. `test-suite.js` - 完整功能测试套件

包含 15 个测试用例，覆盖所有主要功能。

**运行方式：**

```bash
node test/test-suite.js
```

**测试内容：**

- ✓ 颜色样式（span、del 的颜色）
- ✓ Markdown 语法（加粗、斜体、删除线、行内代码）
- ✓ 标题层级（H1-H4）
- ✓ 表格基础功能（列宽、无表头）
- ✓ 表格内 Markdown
- ✓ 文本对齐（居中、左、右、两端、分散）
- ✓ inline-block 并排布局
- ✓ Font 标签颜色
- ✓ Font 包裹 Span（嵌套标签）
- ✓ 首行缩进
- ✓ 表格背景色
- ✓ 列表（有序、无序）
- ✓ 引用块
- ✓ 代码块
- ✓ 超链接
- ✓ 混合复杂内容

**输出：**

- 生成的 DOCX 文件位于 `test/output/`
- 显示详细的校验结果和成功率
- 所有测试通过率：100%

### 2. `test-existing-files.js` - 现有文件测试

测试项目中已有的 Markdown 文件。

**运行方式：**

```bash
node test/test-existing-files.js
```

**测试文件：**

- `testfont.md` - 字体颜色和删除线测试
- `testLayout.md` - 表格布局和 inline-block 测试
- `test.md` - 完整功能测试文档

**输出：**

- 生成的 DOCX 文件位于 `test/output/`
- 显示基本统计（段落数、表格数、图片数）
- 显示特性检测结果

## 测试文件

### `testfont.md`

测试字体颜色和删除线功能（润色作文场景）：

- H2 标题：`## 【润色后作文（基本款）】`
- 蓝色文本标注：`<span style="color: blue;">【's】</span>`（修改后的内容）
- 红色删除线：`<del style="color: red;">jolted</del>`（删除的内容）
- 首行缩进：`<p style="text-indent: 2em;">`
- 混合使用：在同一段落中混用蓝色标注和红色删除线

**测试覆盖：**

- ✓ H2 标题渲染
- ✓ 蓝色文本（0000FF）
- ✓ 红色删除线（FF0000）
- ✓ 首行缩进（2em = 22pt）
- ✓ 长段落中多次使用颜色标注

### `testLayout.md`

测试表格和布局功能：

- inline-block 并排段落
- 表格列宽控制
- 表格背景色
- 表格内 Markdown（标题、加粗）
- `data-noheader` 属性

### `test.md`

完整功能测试文档：

- Font 颜色（颜色名称、十六进制）
- 文本对齐（居中、左、右、两端、分散）
- 图片（居中、右对齐、宽度控制）
- 表格
- inline-block 并排布局
- 列表
- 引用
- 超链接

## 校验器

测试脚本包含以下校验器：

- `hasColor(value)` - 检查是否包含指定颜色（十六进制）
- `hasBold()` - 检查是否包含加粗
- `hasItalic()` - 检查是否包含斜体
- `hasStrike()` - 检查是否包含删除线
- `hasHeading(level)` - 检查是否包含指定级别的标题
- `hasText(value)` - 检查是否包含指定文本
- `hasTable()` - 检查是否包含表格
- `hasIndent()` - 检查是否包含首行缩进
- `hasCenterAlign()` - 检查是否包含居中对齐
- `hasRightAlign()` - 检查是否包含右对齐
- `hasLeftAlign()` - 检查是否包含左对齐
- `hasJustifyAlign()` - 检查是否包含两端对齐
- `hasDistributeAlign()` - 检查是否包含分散对齐
- `hasImage()` - 检查是否包含图片
- `hasBackgroundColor(value)` - 检查是否包含背景色
- `hasInlineCode()` - 检查是否包含行内代码
- `hasCodeBlock()` - 检查是否包含代码块
- `hasList()` - 检查是否包含列表
- `hasQuote()` - 检查是否包含引用
- `hasHyperlink()` - 检查是否包含超链接
- `hasFrame()` - 检查是否包含 Frame（inline-block 并排）
- `hasNoTableHeader()` - 检查表格是否无表头

## 清理测试文件

```bash
# 清理所有测试输出
Remove-Item test/output -Recurse -Force
```

## 一键运行所有测试

```bash
# Windows PowerShell
node test/run-all-tests.js

# 或者分别运行
node test/test-suite.js          # 功能测试套件
node test/test-existing-files.js # 现有文件测试
```

## 添加新测试

在 `test-suite.js` 的 `testCases` 数组中添加新的测试用例：

```javascript
{
  name: '测试名称',
  filename: '输出文件名',
  markdown: `Markdown 内容`,
  validations: [
    { type: 'hasColor', value: 'FF0000', description: '包含红色' },
    { type: 'hasText', value: '文本', description: '包含指定文本' },
  ]
}
```

## 测试结果

当前所有测试通过率：**100%** ✓

- 16 个功能测试用例全部通过
- 3 个现有文件测试全部通过
- 56 个校验点全部通过

## 一键运行命令

```bash
# 运行所有测试
node test/run-all-tests.js

# 清理测试输出
Remove-Item test/output -Recurse -Force
```
