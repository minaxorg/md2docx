import md2docx from '../src/md2docx/index.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const markdown = `<p>模板前缀</p>
<p><template data-template="inline"></template></p>
<table>
  <tr>
    <td><template data-template="cell"></template></td>
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

