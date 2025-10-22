import { md2docx } from './src/index.js';
import fs from 'fs';


// 测试span标签处理
const testContent = `
<table>
  <tr>
    <td>
      <p><font><span>这是蓝色的span文本</span></font></p>
      <p><del>这是删除线文本</del></p>
    </td>
  </tr>
</table>
<p>
<font><span style="color: blue;">这是蓝色的span文本</span></font>
<del style="color: red;">这是删除线文本</del>
</p>
`;

async function testSpan() {
  try {
    console.log('开始测试span标签处理...');
    console.log('测试内容:', testContent);
    const result = await md2docx(testContent, {
      outputPath: './test-span-output.docx'
    });
    console.log('转换完成，结果类型:', typeof result);
    console.log('结果是否为Buffer:', Buffer.isBuffer(result));
    
    // 将结果保存到文件
    if (Buffer.isBuffer(result)) {
      fs.writeFileSync('./test-span-output.docx', result);
      console.log('文件已保存到: test-span-output.docx');
    }
  } catch (error) {
    console.error('转换失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

testSpan();
