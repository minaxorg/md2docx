import assert from 'assert';
import md2docx from '../src/md2docx/index.js';
import fs from 'fs';

const runMd2htmlTests = async () => {

const result = await md2docx(`<table>
  <tr>
    <td>{{tableMarkdownCell}}</td>
  </tr>
</table>`,{
    templates: {
        tableMarkdownCell:"**加粗文本** 和 *斜体文本*"
    },
  });
  fs.writeFileSync('test/test-table.docx', Buffer.from(result));
};

runMd2htmlTests().catch((error) => {
  console.error('md2html tests failed', error);
  process.exitCode = 1;
});

