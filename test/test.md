# Font 颜色功能测试文档

本文档用于测试 `<font color="...">` 标签在 Markdown 转 DOCX 时的颜色渲染功能。

## 1. 基本颜色名称测试

支持常见的颜色名称：

- 这是<font color="red">红色文字</font>的示例
- 这是<font color="blue">蓝色文字</font>的示例
- 这是<font color="green">绿色文字</font>的示例
- 这是<font color="yellow">黄色文字</font>的示例
- 这是<font color="orange">橙色文字</font>的示例
- 这是<font color="purple">紫色文字</font>的示例
- 这是<font color="pink">粉色文字</font>的示例
<p> 这是<font color="brown">棕色文字</font>的示例</p>

## 2. 更多颜色名称

- <font color="black">黑色</font>
- <font color="white">白色</font>（在白色背景下不可见）
- <font color="gray">灰色</font>
- <font color="cyan">青色</font>
- <font color="magenta">品红色</font>
- <font color="lime">酸橙色</font>
- <font color="navy">海军蓝</font>
- <font color="teal">青绿色</font>
- <font color="silver">银色</font>
- <font color="maroon">栗色</font>
- <font color="olive">橄榄色</font>

## 3. 十六进制颜色测试

支持 6 位十六进制颜色值：

- 这是<font color="#FF0000">十六进制红色 (#FF0000)</font>
- 这是<font color="#0000FF">十六进制蓝色 (#0000FF)</font>
- 这是<font color="#00FF00">十六进制绿色 (#00FF00)</font>
- 这是<font color="#FFA500">十六进制橙色 (#FFA500)</font>
- 这是<font color="#800080">十六进制紫色 (#800080)</font>

## 4. 三位十六进制颜色

支持 3 位简写的十六进制颜色：

- <font color="#F00">三位红色 (#F00)</font>
- <font color="#0F0">三位绿色 (#0F0)</font>
- <font color="#00F">三位蓝色 (#00F)</font>
- <font color="#F90">三位橙色 (#F90)</font>

## 5. 混合格式测试

颜色可以与其他格式混合使用：

- <font color="red">**粗体红色文字**</font>
- <font color="blue">_斜体蓝色文字_</font>
- <font color="green">**_粗斜体绿色文字_**</font>
- <font color="purple">~~删除线紫色文字~~</font>
- <font color="orange">`代码样式橙色`</font>

## 6. 段落中混合使用

在一个段落中可以使用多种颜色：这里是<font color="red">红色</font>，然后是<font color="green">绿色</font>，接着是<font color="blue">蓝色</font>，最后是<font color="orange">橙色</font>。普通文字会保持默认颜色。

## 7. 列表中使用颜色

### 无序列表

- 第一项包含<font color="red">红色文字</font>
- 第二项包含<font color="blue">蓝色文字</font>
- 第三项包含<font color="green">绿色文字</font>

### 有序列表

1. <font color="purple">紫色的第一项</font>
2. <font color="orange">橙色的第二项</font>
3. <font color="pink">粉色的第三项</font>

## 8. 表格中使用颜色

| 列 1                             | 列 2                                 | 列 3                            |
| -------------------------------- | ------------------------------------ | ------------------------------- |
| <font color="red">红色</font>    | <font color="green">绿色</font>      | <font color="blue">蓝色</font>  |
| 普通文字                         | <font color="purple">紫色文字</font> | 普通文字                        |
| <font color="orange">橙色</font> | <font color="pink">粉色</font>       | <font color="brown">棕色</font> |

## 9. 引用块中使用颜色

> 这是一个引用块
>
> 引用中可以包含<font color="red">红色文字</font>和<font color="blue">蓝色文字</font>
>
> <font color="green">整句绿色的引用文字</font>

## 10. 嵌套和复杂场景

这是一个复杂的例子：<font color="red">红色文字中包含**粗体**，然后是<font color="blue">嵌套的蓝色</font>，回到红色</font>，最后是普通文字。

## 11. 链接中使用颜色

- 普通链接：[点击这里](https://example.com)
- 带颜色的链接文字：<font color="red">[红色链接](https://example.com)</font>
- 链接中部分文字带颜色：这是一个<font color="blue">蓝色的</font>[链接](https://example.com)

## 12. 标题中使用颜色（如果支持）

### <font color="red">这是红色的标题</font>

### <font color="blue">这是蓝色的标题</font>

## 13. 边界情况测试

- 空的颜色标签：<font color="">无颜色</font>
- 大小写混合：<font color="ReD">红色 RED</font>
- 带空格的颜色名：<font color=" blue ">蓝色带空格</font>
- 无效颜色名：<font color="notacolor">无效颜色名</font>（应该显示为普通文字）

---

## 14.文字居中测试

<p align="center">这段文字应该在居中显示</p>
<p align="center">
    <img style="width:50%;" src="https://otf-pub-cdn.ourteacher.cc/ourai-admin/assets/c369ec71/Snipaste_2025-10-13_15-53-35.png" />
</p>

<p style="text-align:right"><img style="width:50%;" src="https://otf-pub-cdn.ourteacher.cc/ourai-admin/assets/c369ec71/Snipaste_2025-10-13_15-53-35.png" /></p>

<p align="justify">
  <font color="red">红色jjustify</font>
  <font color="green">绿色justify</font> <font color="blue">蓝色justify</font>
</p>
 <p align="distribute">
          <font color="black"> 学生姓名：${data.studentName}</font>
          <font color="black"> 作文分数：${data.score}</font>
          <font color="black"> 作文等级：${data.grade}</font>
</p>
<p align="left">
  <font color="red">left</font>
  <font color="green">left</font> <font color="blue">left</font>
</p>
<p align="right">
  <font color="red">left</font>
  <font color="green">left</font> <font color="blue">left</font>
</p>

| 学生姓名：${data.studentName} | 作文分数：${data.score} 作文等级：${data.grade} |

**测试日期**: 2025-10-14
**功能版本**: v2.1.107

---
