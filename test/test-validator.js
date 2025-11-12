import fs from 'fs';

const xml = fs.readFileSync('test-output-3-extracted/word/document.xml', 'utf-8');

console.log('XML 长度:', xml.length);
console.log('是否包含 Heading2:', xml.includes('Heading2'));
console.log('是否包含 pStyle:', xml.includes('pStyle'));

const regex = new RegExp(`<w:pStyle w:val="Heading2"`);
console.log('正则测试结果:', regex.test(xml));

// 提取包含 pStyle 的部分
const match = xml.match(/<w:pStyle[^>]*>/);
console.log('\n找到的 pStyle 标签:', match ? match[0] : '未找到');

