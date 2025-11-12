import md2docx from '../src/md2docx/index.js';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

/**
 * 测试用例配置
 */
const testCases = [
  {
    name: '颜色样式测试',
    markdown: `<p>普通文本 <span style="color: blue;">蓝色文本</span> <del style="color: red;">红色删除线</del> 结束</p>`,
    validations: [
      { type: 'hasColor', value: '0000FF', description: '包含蓝色 (0000FF)' },
      { type: 'hasColor', value: 'FF0000', description: '包含红色 (FF0000)' },
      { type: 'hasStrike', description: '包含删除线' },
    ]
  },
  {
    name: 'Markdown 语法测试',
    markdown: `这是 **加粗** 和 *斜体* 还有 ~~删除线~~ 文本`,
    validations: [
      { type: 'hasBold', description: '包含加粗' },
      { type: 'hasItalic', description: '包含斜体' },
      { type: 'hasStrike', description: '包含删除线' },
    ]
  },
  {
    name: '标题测试',
    markdown: `## 二级标题\n\n段落文本`,
    validations: [
      { type: 'hasHeading', level: 2, description: '包含 H2 标题' },
      { type: 'hasText', value: '二级标题', description: '标题文本正确' },
    ]
  },
  {
    name: '表格测试',
    markdown: `<table data-noheader>
  <tr>
    <td style="width: 50%">左列</td>
    <td style="width: 50%">右列</td>
  </tr>
</table>`,
    validations: [
      { type: 'hasTable', description: '包含表格' },
      { type: 'hasText', value: '左列', description: '包含左列文本' },
      { type: 'hasText', value: '右列', description: '包含右列文本' },
    ]
  },
  {
    name: '混合内容测试',
    markdown: `<p style="text-indent: 2em;">段落 <span style="color: blue;">**蓝色加粗**</span> 文本</p>`,
    validations: [
      { type: 'hasColor', value: '0000FF', description: '包含蓝色' },
      { type: 'hasBold', description: '包含加粗' },
      { type: 'hasIndent', description: '包含首行缩进' },
    ]
  },
];

/**
 * 校验函数
 */
const validators = {
  hasColor: (xml, value) => {
    const regex = new RegExp(`<w:color w:val="${value}"`);
    return regex.test(xml);
  },

  hasBold: (xml) => {
    return xml.includes('<w:b/>') || xml.includes('<w:b ');
  },

  hasItalic: (xml) => {
    return xml.includes('<w:i/>') || xml.includes('<w:i ');
  },

  hasStrike: (xml) => {
    return xml.includes('<w:strike/>') || xml.includes('<w:strike ');
  },

  hasHeading: (xml, level) => {
    const regex = new RegExp(`<w:pStyle w:val="Heading${level}"`);
    return regex.test(xml);
  },

  hasText: (xml, value) => {
    const escapedValue = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return xml.includes(escapedValue) || xml.includes(value);
  },

  hasTable: (xml) => {
    return xml.includes('<w:tbl>');
  },

  hasIndent: (xml) => {
    return xml.includes('<w:ind w:firstLine="22pt"');
  },
};

/**
 * 运行单个测试
 */
async function runTest(testCase, index) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试 ${index + 1}: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);

  try {
    // 转换 Markdown 为 DOCX
    const result = await md2docx(testCase.markdown, {});

    // 保存文件
    const outputFile = `test-output-${index + 1}.docx`;
    const zipFile = `test-output-${index + 1}.zip`;
    const extractDir = `test-output-${index + 1}-extracted`;

    fs.writeFileSync(outputFile, result);
    fs.writeFileSync(zipFile, result);

    // 解压并读取 document.xml
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    execSync(`powershell -Command "Expand-Archive -Path ${zipFile} -DestinationPath ${extractDir}"`, { stdio: 'ignore' });

    const xmlPath = path.join(extractDir, 'word', 'document.xml');
    const xml = fs.readFileSync(xmlPath, 'utf-8');

    // 运行校验
    let passed = 0;
    let failed = 0;

    console.log('\n校验结果:');
    for (const validation of testCase.validations) {
      const validator = validators[validation.type];
      if (!validator) {
        console.log(`  ⚠️  未知的校验类型: ${validation.type}`);
        continue;
      }

      const result = validator(xml, validation.level || validation.value);
      if (result) {
        console.log(`  ✓ ${validation.description}`);
        passed++;
      } else {
        console.log(`  ✗ ${validation.description}`);
        // 调试输出
        if (validation.type === 'hasHeading') {
          const pattern = `<w:pStyle w:val="Heading${validation.level}"`;
          console.log(`     调试: 查找 "${pattern}"`);
          console.log(`     XML 包含 "Heading${validation.level}":`, xml.includes(`Heading${validation.level}`));
          console.log(`     XML 包含 "pStyle":`, xml.includes('pStyle'));
        }
        failed++;
      }
    }

    console.log(`\n结果: ${passed} 通过, ${failed} 失败`);

    // 清理临时文件
    fs.unlinkSync(zipFile);
    fs.rmSync(extractDir, { recursive: true, force: true });

    return { passed, failed, outputFile };

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    return { passed: 0, failed: testCase.validations.length, error: error.message };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('开始运行测试...\n');

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const result = await runTest(testCases[i], i);
    results.push(result);
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  // 总结
  console.log(`\n${'='.repeat(60)}`);
  console.log('测试总结');
  console.log(`${'='.repeat(60)}`);
  console.log(`总测试数: ${testCases.length}`);
  console.log(`总校验数: ${totalPassed + totalFailed}`);
  console.log(`通过: ${totalPassed}`);
  console.log(`失败: ${totalFailed}`);
  console.log(`成功率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%`);

  // 列出生成的文件
  console.log('\n生成的文件:');
  results.forEach((result, index) => {
    if (result.outputFile) {
      console.log(`  ${index + 1}. ${result.outputFile}`);
    }
  });

  // 清理选项
  console.log('\n提示: 运行以下命令清理测试文件:');
  console.log('  Remove-Item test-output-*.docx -Force');
}

// 运行测试
runAllTests().catch(console.error);

