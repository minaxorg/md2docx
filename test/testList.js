import { mdList2docx } from "../src/md2docx/index.js";
import fs from "fs";
import { execSync } from "child_process";
import path from "path";

// 列表功能测试用例
const listTestArr = [
  {
    content: `
# 第一个文档 - 列表测试

## 有序列表测试

1. 第一项内容
2. 第二项内容
3. 第三项内容

## 第二个有序列表

1. 新列表的第一项
2. 新列表的第二项
3. 新列表的第三项

## 无序列表测试

- 无序列表第一项
- 无序列表第二项
- 无序列表第三项

## 第三个有序列表

1. 第三个列表的第一项
2. 第三个列表的第二项
`,
  },
  {
    content: `
# 第二个文档 - 列表测试

## 第二个文档的第一个列表

1. 第二个文档的第一项
2. 第二个文档的第二项
3. 第二个文档的第三项

## 第二个文档的第二个列表

1. 第二个文档新列表的第一项
2. 第二个文档新列表的第二项
`,
  },
];


const testData = listTestArr;
const md = testData.map((el) => el.content);
const templates = testData
  .map((el) => el.templates || {})
  .reduce((acc, obj) => ({ ...acc, ...obj }), {});

const outputPath = path.join(process.cwd(), "test",    "testList-simple.docx" );

// md2docx 返回 Promise<Buffer>，需要使用 await
const buffer = await mdList2docx(md, {
  templates: templates,
  styleOptions: {
    defaultFontSize: 18,
  },
  docxTitleList: ["列表测试文档1", "列表测试文档2"]
});

// 将 buffer 写入文件
fs.writeFileSync(outputPath, buffer);

console.log(`文档已成功生成: ${outputPath}`);

// 自动打开生成的文档
try {
//   execSync(`start "" "${outputPath}"`, { shell: true });
} catch (error) {
  console.log("无法自动打开文档,请手动打开:", outputPath);
}
