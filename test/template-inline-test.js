import md2docx from '../src/md2docx/index.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const markdown = `<p>模板前缀</p>
<p>{{inline}}</p>
<table>
  <tr>
    <td>{{cell}}</td>
  </tr>
</table>`;

  const templates = {
    inline: `**模板加粗**`,
    cell: `**单元格加粗**`,
  };

  const result = await md2docx(markdown, { templates });
  const outputDir = path.resolve('test/individual');
  const file = path.join(outputDir, 'template-inline.docx');
  fs.writeFileSync(file, result);
  console.log('Written:', file);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

