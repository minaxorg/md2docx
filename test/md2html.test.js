import assert from 'assert';
import { md2html } from '../src/md2docx/index.js';

const markdownTestCases = [
  {
    description: 'heading converts to h1 element',
    input: '# Title',
    expected: '<h1>Title</h1>\n',
  },
  {
    description: 'unordered list renders list items',
    input: '- item',
    expected: '<ul>\n<li>item</li>\n</ul>\n',
  },
  {
    description: 'link preserves href attribute',
    input: '[link](https://example.com)',
    expected: '<p><a href="https://example.com">link</a></p>\n',
  },
  {
    description: 'mixed html and markdown renders sanitized output',
    input: '<strong>HTML</strong> and *markdown*',
    expected: '<p><strong>HTML</strong> and <em>markdown</em></p>\n',
  },
];

const runMd2htmlTests = async () => {
  for (const { description, input, expected } of markdownTestCases) {
    const html = await md2html(input);
    assert.strictEqual(html, expected, `md2html should match ${description}`);
  }

  const emptyHtml = await md2html('');
  assert.strictEqual(emptyHtml, '', 'md2html should return empty string for empty markdown input');

  console.log('md2html tests passed');
};

runMd2htmlTests().catch((error) => {
  console.error('md2html tests failed', error);
  process.exitCode = 1;
});

