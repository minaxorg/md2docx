#!/usr/bin/env node

/**
 * 测试 mdastList 合并功能
 * 验证修复后的合并是否正常工作
 */

import { writeFile } from 'fs/promises';
import { mdList2docx } from './src/md2docx/index.js';

async function testMerge() {
  console.log('🧪 开始测试 mdastList 合并功能...');
  
  // 创建测试用的 markdown 文档列表
  const mdList = [
    `# 第一个文档

这是一个包含列表的文档：

1. 第一项
2. 第二项
   - 子项 1
   - 子项 2

## 图片测试
![测试图片](https://cos-file.ourschool.cc/icons/interactive_icon.png)

## 表格测试
| 列1 | 列2 |
|-----|-----|
| 数据1 | 数据2 |
| 数据3 | 数据4 |`,

    `# 第二个文档

这是第二个文档，也包含列表：

- 无序列表项 1
- 无序列表项 2
  - 嵌套项 A
  - 嵌套项 B

## 另一个图片
![测试图片2](https://cos-file.ourschool.cc/icons/interactive_icon.png)

## 代码块
\`\`\`javascript
console.log('Hello from doc 2');
\`\`\``,

    `# 第三个文档

最后一个文档：

> 这是一个引用块
> 包含多行内容

## 链接测试
[访问 GitHub](https://github.com)

## 最终列表
1. 项目 A
2. 项目 B
3. 项目 C`
  ];

  const docxTitleList = [
    '第一部分：基础文档',
    '第二部分：进阶内容', 
    '第三部分：总结'
  ];

  try {
    console.log('📝 正在合并文档...');
    const buffer = await mdList2docx(mdList, {
      docxTitleList,
      pageHeader: '合并测试文档',
      log: console
    });

    console.log('💾 保存合并后的文档...');
    await writeFile('./test-merged.docx', buffer);
    
    console.log('✅ 测试完成！合并后的文档已保存为 test-merged.docx');
    console.log('📊 文档大小:', buffer.length, 'bytes');
    
    // 验证 buffer 是否有效
    if (buffer && buffer.length > 0) {
      console.log('✅ Buffer 验证通过');
    } else {
      console.log('❌ Buffer 验证失败');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testMerge().catch(console.error);
