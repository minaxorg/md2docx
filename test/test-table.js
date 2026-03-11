import md2docx from '../src/md2docx/index.js';
import fs from 'fs';

const runMd2docxTableTests = async () => {
  // 基础模板占位符表格
  const basicResult = await md2docx(`<table>
  <tr>
    <td>{{tableMarkdownCell}}</td>
  </tr>
</table>`, {
    templates: {
      tableMarkdownCell: '**加粗文本** 和 *斜体文本*',
    },
  });
  fs.writeFileSync('test/test-table-basic.docx', Buffer.from(basicResult));

  // 首行只有 colspan、第二行开始指定 width 的表格
  const alignResult = await md2docx(`
<table>
  <tr>
    <th colspan="6" align="center"><b>三年级《春天举行音乐会》第三课时教学方案</b></th>
  </tr>
  <tr>
    <td width="15%"><b>课时名称</b></td>
    <td width="15%">春天举行音乐会</td>
    <td width="15%" align="center"><b>学科</b></td>
    <td width="15%" align="center">音乐</td>
    <td width="25%" align="center"><b>课时</b></td>
    <td width="15%">第三课时</td>
  </tr>
</table>
`, {});
  fs.writeFileSync('test/test-table-align-colspan.docx', Buffer.from(alignResult));
};

runMd2docxTableTests().catch((error) => {
  console.error('md2docx table tests failed', error);
  process.exitCode = 1;
});

