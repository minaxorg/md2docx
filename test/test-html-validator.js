import { validateHtmlTags, fixHtmlTags } from '../src/html-validator.js';

/**
 * HTML 验证器测试用例
 */
const testCases = [
  '## Markdown标题\n\n<ul><li>列表项1</li><li>列表项2',
  '<p>这是一个完整的段落</p>',
  '<p>这是一个不完整的段落',
  '<div><p>嵌套标签</p></div>',
  '<p>段落</p></p>',
  '<p>段落</p><div>另一个div',
  '## Markdown标题\n\n<p>HTML段落</p>',
  '<p style="color: red;">带样式的段落</p>',
  '<img src="test.jpg" alt="test" />', // 自闭合标签
  '<img /><br />', // 自闭合标签
];

console.log('HTML标签验证测试:\n');

testCases.forEach((testCase, index) => {
  console.log(`测试 ${index + 1}: ${testCase}`);
  const result = validateHtmlTags(testCase);
  console.log(`结果: ${result.isValid ? '✅ 有效' : '❌ 无效'}`);

  if (!result.isValid) {
    console.log('错误:');
    result.errors.forEach(error => console.log(`  - ${error}`));
    console.log('建议:');
    result.suggestions.forEach(suggestion => console.log(`  - ${suggestion.message}`));

    const fixed = fixHtmlTags(testCase);
    console.log(`修复后: ${fixed}`);
  }
  console.log('---');
});
