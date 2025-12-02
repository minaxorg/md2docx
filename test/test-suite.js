import md2docx from '../src/md2docx/index.js';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

/**
 * 校验器集合
 */
const validators = {
  // 检查是否包含指定颜色
  hasColor: (xml, value) => {
    const regex = new RegExp(`<w:color w:val="${value}"`);
    return regex.test(xml);
  },

  // 检查是否包含加粗
  hasBold: (xml) => {
    return xml.includes('<w:b/>') || xml.includes('<w:b ');
  },

  // 检查是否包含斜体
  hasItalic: (xml) => {
    return xml.includes('<w:i/>') || xml.includes('<w:i ');
  },

  // 检查是否包含删除线
  hasStrike: (xml) => {
    return xml.includes('<w:strike/>') || xml.includes('<w:strike ');
  },

  // 检查是否包含指定级别的标题
  hasHeading: (xml, level) => {
    const regex = new RegExp(`<w:pStyle w:val="Heading${level}"`);
    return regex.test(xml);
  },

  // 检查是否包含指定文本
  hasText: (xml, value) => {
    const escapedValue = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    return xml.includes(escapedValue) || xml.includes(value);
  },

  // 检查是否包含表格
  hasTable: (xml) => {
    return xml.includes('<w:tbl>');
  },

  // 检查是否包含首行缩进
  hasIndent: (xml) => {
    return xml.includes('<w:ind w:firstLine="22pt"');
  },

  // 检查是否包含居中对齐
  hasCenterAlign: (xml) => {
    return xml.includes('<w:jc w:val="center"');
  },

  // 检查是否包含右对齐
  hasRightAlign: (xml) => {
    return xml.includes('<w:jc w:val="end"') || xml.includes('<w:jc w:val="right"');
  },

  // 检查是否包含左对齐
  hasLeftAlign: (xml) => {
    return xml.includes('<w:jc w:val="start"') || xml.includes('<w:jc w:val="left"');
  },

  // 检查是否包含两端对齐
  hasJustifyAlign: (xml) => {
    return xml.includes('<w:jc w:val="both"');
  },

  // 检查是否包含分散对齐
  hasDistributeAlign: (xml) => {
    return xml.includes('<w:jc w:val="distribute"');
  },

  // 检查是否包含图片
  hasImage: (xml) => {
    return xml.includes('<w:drawing>') || xml.includes('<w:pict>');
  },

  // 检查是否包含背景色
  hasBackgroundColor: (xml, value) => {
    const regex = new RegExp(`<w:shd[^>]*w:fill="${value}"`);
    return regex.test(xml);
  },

  // 检查是否包含行内代码
  hasInlineCode: (xml) => {
    return xml.includes('w:val="InlineCode"');
  },

  // 检查是否包含代码块
  hasCodeBlock: (xml) => {
    return xml.includes('w:val="CodeBlock"');
  },

  // 检查是否包含列表
  hasList: (xml) => {
    return xml.includes('<w:numPr>') || xml.includes('<w:bullet>');
  },

  // 检查有序列表编号是否正确重置（通过检查是否有非列表段落分隔列表组）
  hasListInstances: (xml, expected = 2) => {
    // 查找所有段落
    const allParagraphs = xml.match(/<w:p>.*?<\/w:p>/gs) || [];
    if (allParagraphs.length < 2) return false;

    // 统计列表组：连续的列表段落算一组，被非列表段落分隔的算不同组
    let listGroups = 0;
    let inList = false;
    let lastWasList = false;

    for (const para of allParagraphs) {
      const hasNumPr = para.includes('<w:numPr>');
      const hasText = para.includes('<w:t>') && !para.match(/<w:t[^>]*>\s*<\/w:t>/);

      if (hasNumPr) {
        // 这是列表段落
        if (!inList) {
          // 开始新的列表组
          listGroups++;
          inList = true;
        }
        lastWasList = true;
      } else if (hasText) {
        // 这是有内容的非列表段落，结束当前列表组
        if (inList) {
          inList = false;
        }
        lastWasList = false;
      } else {
        // 空段落，如果之前是列表，这可能是一个分隔
        if (lastWasList) {
          inList = false;
        }
      }
    }

    // 如果有多个列表组，说明编号被重置了
    return listGroups >= expected;
  },

  // 检查是否包含引用
  hasQuote: (xml) => {
    return xml.includes('w:val="Quote"');
  },

  // 检查是否包含超链接
  hasHyperlink: (xml) => {
    return xml.includes('<w:hyperlink');
  },


  // 检查表格是否无表头（检查第一行是否没有粉红色背景）
  hasNoTableHeader: (xml) => {
    // 如果表格第一行没有 F4CCCD 背景色，说明没有表头样式
    const firstRowMatch = xml.match(/<w:tr>(.*?)<\/w:tr>/s);
    if (!firstRowMatch) return false;
    return !firstRowMatch[1].includes('F4CCCD');
  },

  // 检查表格第一行文本是否不加粗（用于验证 data-noheader 功能）
  hasTableFirstRowNotBold: (xml) => {
    // 找到第一个表格的第一行
    const tableMatch = xml.match(/<w:tbl>(.*?)<\/w:tbl>/s);
    if (!tableMatch) return false;

    const tableContent = tableMatch[1];
    const firstRowMatch = tableContent.match(/<w:tr>(.*?)<\/w:tr>/s);
    if (!firstRowMatch) return false;

    const firstRowContent = firstRowMatch[1];
    // 检查第一行中是否有加粗标记
    // 如果第一行包含 <w:b/> 或 <w:b ，说明有加粗，返回 false
    // 如果第一行不包含加粗标记，说明不加粗，返回 true
    return !firstRowContent.includes('<w:b/>') && !firstRowContent.includes('<w:b ');
  },
};

/**
 * 运行单个测试
 */
async function runTest(testCase, index, outputDir) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`测试 ${index + 1}: ${testCase.name}`);
  console.log(`${'='.repeat(70)}`);

  if (testCase.description) {
    console.log(`说明: ${testCase.description}`);
  }

  try {
    // 转换 Markdown 为 DOCX
    const result = await md2docx(testCase.markdown, testCase.options || {});

    // 保存文件
    const outputFile = path.join(outputDir, `${testCase.filename || `test-${index + 1}`}.docx`);
    const zipFile = outputFile.replace('.docx', '.zip');
    const extractDir = outputFile.replace('.docx', '-extracted');

    fs.writeFileSync(outputFile, result);
    fs.writeFileSync(zipFile, result);

    // 解压并读取 document.xml
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    execSync(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${extractDir}'"`, { stdio: 'ignore' });

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
        failed++;
      }
    }

    console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
    console.log(`输出文件: ${outputFile}`);

    // 清理临时文件
    fs.unlinkSync(zipFile);
    fs.rmSync(extractDir, { recursive: true, force: true });

    return { passed, failed, outputFile, success: failed === 0 };

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    console.error(error.stack);
    return { passed: 0, failed: testCase.validations.length, error: error.message, success: false };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('开始运行 md2docx 测试套件...\n');

  // 创建输出目录（在项目根目录的 test/output）
  const testDir = path.resolve(process.cwd(), 'test');
  const outputDir = path.join(testDir, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 定义测试用例
  const testCases = [
    // 基础功能测试
    {
      name: '颜色样式测试',
      filename: 'colors',
      markdown: `<p>普通文本 <span style="color: blue;">蓝色文本</span> <del style="color: red;">红色删除线</del> 结束</p>`,
      validations: [
        { type: 'hasColor', value: '0000FF', description: '包含蓝色 (0000FF)' },
        { type: 'hasColor', value: 'FF0000', description: '包含红色 (FF0000)' },
        { type: 'hasStrike', description: '包含删除线' },
      ]
    },

    {
      name: 'Markdown 语法测试',
      filename: 'markdown-syntax',
      markdown: `这是 **加粗** 和 *斜体* 还有 ~~删除线~~ 和 \`行内代码\` 文本`,
      validations: [
        { type: 'hasBold', description: '包含加粗' },
        { type: 'hasItalic', description: '包含斜体' },
        { type: 'hasStrike', description: '包含删除线' },
        { type: 'hasInlineCode', description: '包含行内代码' },
      ]
    },

    {
      name: '标题层级测试',
      filename: 'headings',
      markdown: `# H1 标题\n\n## H2 标题\n\n### H3 标题\n\n#### H4 标题`,
      validations: [
        { type: 'hasHeading', level: 1, description: '包含 H1 标题' },
        { type: 'hasHeading', level: 2, description: '包含 H2 标题' },
        { type: 'hasHeading', level: 3, description: '包含 H3 标题' },
        { type: 'hasHeading', level: 4, description: '包含 H4 标题' },
      ]
    },

    {
      name: '表格基础测试',
      filename: 'table-basic',
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
        { type: 'hasNoTableHeader', description: '表格无表头样式' },
      ]
    },

    {
      name: '表格内正文粗细测试',
      filename: 'table-text-weight',
      markdown: `<table data-noheader="true">
  <tr>
    <td style="width: 50%">普通文本第一列</td>
    <td style="width: 50%">普通文本第二列</td>
  </tr>
  <tr>
    <td>第二行普通文本</td>
    <td><strong>第二行加粗文本</strong></td>
  </tr>
</table>`,
      validations: [
        { type: 'hasTable', description: '包含表格' },
        { type: 'hasText', value: '普通文本第一列', description: '包含第一列文本' },
        { type: 'hasText', value: '普通文本第二列', description: '包含第二列文本' },
        { type: 'hasTableFirstRowNotBold', description: '表格第一行文本不加粗（data-noheader 生效）' },
        { type: 'hasBold', description: '表格内加粗文本正常渲染（第二行加粗文本）' },
        { type: 'hasNoTableHeader', description: '表格无表头背景色' },
      ]
    },

    {
      name: '表格内 Markdown 测试',
      filename: 'table-markdown',
      markdown: `<table>
  <tr>
    <td>{{tableMarkdownCell}}</td>
  </tr>
</table>`,
      options: {
        templates: {
          tableMarkdownCell: `**加粗文本** 和 *斜体文本*`,
        },
      },
      validations: [
        { type: 'hasTable', description: '包含表格' },
        { type: 'hasBold', description: '单元格内包含加粗' },
        { type: 'hasItalic', description: '单元格内包含斜体' },
      ]
    },

    {
      name: '文本对齐测试',
      filename: 'text-align',
      markdown: `<p align="center">居中文本</p>
<p align="left">左对齐文本</p>
<p align="right">右对齐文本</p>
<p align="justify">两端对齐文本</p>
<p align="distribute">分散对齐文本</p>`,
      validations: [
        { type: 'hasCenterAlign', description: '包含居中对齐' },
        { type: 'hasLeftAlign', description: '包含左对齐' },
        { type: 'hasRightAlign', description: '包含右对齐' },
        { type: 'hasJustifyAlign', description: '包含两端对齐' },
        { type: 'hasDistributeAlign', description: '包含分散对齐' },
      ]
    },
    {
      name: 'Div 包裹 Font + Bold 居中场景',
      filename: 'div-font-bold-center',
      markdown: `<div align="center"><font size="5" face="黑体"><b>当时只道是寻常</b></font></div>`,
      validations: [
        { type: 'hasBold', description: '嵌套 <b> 渲染为加粗' },
        { type: 'hasText', value: '当时只道是寻常', description: '文本内容存在' },
      ]
    },
    {
      name: 'Font 标签颜色测试',
      filename: 'font-colors',
      markdown: `<font color="red">红色</font> <font color="blue">蓝色</font> <font color="green">绿色</font>
<font color="#FF0000">十六进制红色</font> <font color="#F00">三位红色</font>`,
      validations: [
        { type: 'hasColor', value: 'FF0000', description: '包含红色' },
        { type: 'hasColor', value: '0000FF', description: '包含蓝色' },
        { type: 'hasColor', value: '008000', description: '包含绿色' },
      ]
    },

    {
      name: '首行缩进测试',
      filename: 'text-indent',
      markdown: `<p style="text-indent: 2em;">这是一个首行缩进的段落。</p>`,
      validations: [
        { type: 'hasIndent', description: '包含首行缩进 (2em)' },
        { type: 'hasText', value: '这是一个首行缩进的段落', description: '文本正确' },
      ]
    },

    {
      name: '表格背景色测试',
      filename: 'table-bgcolor',
      markdown: `<table>
  <tr>
    <td style="background-color: #FFFF00">黄色背景</td>
    <td style="background-color: #00FFFF">青色背景</td>
  </tr>
</table>`,
      validations: [
        { type: 'hasTable', description: '包含表格' },
        { type: 'hasBackgroundColor', value: 'FFFF00', description: '包含黄色背景' },
        { type: 'hasBackgroundColor', value: '00FFFF', description: '包含青色背景' },
      ]
    },

    {
      name: '列表测试',
      filename: 'lists',
      markdown: `- 无序列表项 1
- 无序列表项 2

1. 有序列表项 1
2. 有序列表项 2`,
      validations: [
        { type: 'hasList', description: '包含列表' },
        { type: 'hasText', value: '无序列表项 1', description: '包含无序列表文本' },
        { type: 'hasText', value: '有序列表项 1', description: '包含有序列表文本' },
      ]
    },

    {
      name: '多有序列表编号重置测试',
      filename: 'lists-multi-ordered',
      markdown: `1. 第一组第 1 项
2. 第一组第 2 项
## 测试标题
1. 第二组第 1 项
2. 第二组第 2 项`,
      validations: [
        { type: 'hasList', description: '包含有序列表' },
        // 期望至少有两个不同的 numId，表示有两个独立的列表实例
        { type: 'hasListInstances', value: 2, description: '存在两个独立的有序列表实例（编号应分别从 1 开始）' },
      ]
    },

    {
      name: '引用块测试',
      filename: 'blockquote',
      markdown: `> 这是一个引用块
>
> 引用中的内容`,
      validations: [
        { type: 'hasQuote', description: '包含引用样式' },
        { type: 'hasText', value: '这是一个引用块', description: '包含引用文本' },
      ]
    },

    {
      name: '代码块测试',
      filename: 'code-block',
      markdown: '```javascript\nconst hello = "world";\n```',
      validations: [
        { type: 'hasCodeBlock', description: '包含代码块样式' },
        { type: 'hasText', value: 'const hello', description: '包含代码文本' },
      ]
    },

    {
      name: '超链接测试',
      filename: 'hyperlink',
      markdown: `这是一个[链接](https://example.com "标题")文本`,
      validations: [
        { type: 'hasHyperlink', description: '包含超链接' },
        { type: 'hasText', value: '链接', description: '包含链接文本' },
      ]
    },

    {
      name: 'Font 包裹 Span 测试',
      filename: 'font-span-nested',
      markdown: `<p>
<font><span style="color: blue;">这是蓝色的span文本</span></font>
<del style="color: red;">这是删除线文本</del>
</p>

<table>
  <tr>
    <td>
      <p><font><span style="color: blue;">表格内蓝色</span></font></p>
      <p><del style="color: red;">表格内删除线</del></p>
    </td>
  </tr>
</table>`,
      validations: [
        { type: 'hasColor', value: '0000FF', description: '包含蓝色' },
        { type: 'hasColor', value: 'FF0000', description: '包含红色' },
        { type: 'hasStrike', description: '包含删除线' },
        { type: 'hasTable', description: '包含表格' },
      ]
    },

    {
      name: '混合复杂内容测试',
      filename: 'complex-mixed',
      markdown: `## 标题

<p style="text-indent: 2em;">段落 <span style="color: blue;"><strong>蓝色加粗</strong></span> <del style="color: red;">红色删除</del> 文本</p>

- 列表项 1
- 列表项 2

<table>
  <tr>
    <td style="background-color: #FFFF00">单元格内容</td>
  </tr>
</table>`,
      validations: [
        { type: 'hasHeading', level: 2, description: '包含 H2 标题' },
        { type: 'hasIndent', description: '包含首行缩进' },
        { type: 'hasColor', value: '0000FF', description: '包含蓝色' },
        { type: 'hasColor', value: 'FF0000', description: '包含红色' },
        { type: 'hasBold', description: '包含加粗' },
        { type: 'hasStrike', description: '包含删除线' },
        { type: 'hasList', description: '包含列表' },
        { type: 'hasTable', description: '包含表格' },
        { type: 'hasBackgroundColor', value: 'FFFF00', description: '包含黄色背景' },
      ]
    },

    {
      name: 'Template 占位符测试',
      filename: 'template-placeholders-html-mix',
      markdown: `<p>前置文本</p>
{{intro}}
<p>后置文本</p>
<table>
  <tr>
    <td style="width: 50%; background-color: #ffffff">静态文本</td>
    <td style="width: 50%; background-color: #ffffff">{{details}}</td>
  </tr>
</table>`,
      options: {
        templates: {
          intro: `<h1>模板标题</h1>
<p>这是模板段落。</p>`,
          details: `<ul>
  <li>列表项 A</li>
  <li>列表项 B</li>
</ul>`,
        },
      },
      validations: [
        { type: 'hasHeading', level: 1, description: '模板标题渲染为 Heading1' },
        { type: 'hasText', value: '这是模板段落。', description: '模板段落文本已插入' },
        { type: 'hasList', description: '模板列表渲染为列表' },
        { type: 'hasText', value: '列表项 A', description: '模板列表项 A 存在' },
      ],
    },
  ];

  const results = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const result = await runTest(testCases[i], i, outputDir);
    results.push(result);
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  // 总结
  console.log(`\n${'='.repeat(70)}`);
  console.log('测试总结');
  console.log(`${'='.repeat(70)}`);
  console.log(`总测试数: ${testCases.length}`);
  console.log(`总校验数: ${totalPassed + totalFailed}`);
  console.log(`✓ 通过: ${totalPassed}`);
  console.log(`✗ 失败: ${totalFailed}`);
  console.log(`成功率: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2)}%`);

  // 统计成功/失败的测试
  const successTests = results.filter(r => r.success).length;
  const failedTests = results.filter(r => !r.success).length;
  console.log(`\n测试用例: ${successTests} 成功, ${failedTests} 失败`);

  // 列出生成的文件
  console.log(`\n生成的文件位于: ${outputDir}`);
  results.forEach((result, index) => {
    const status = result.success ? '✓' : '✗';
    console.log(`  ${status} ${index + 1}. ${path.basename(result.outputFile || 'error')}`);
  });

  console.log(`\n提示: 运行以下命令清理测试文件:`);
  console.log(`  Remove-Item "${outputDir}" -Recurse -Force`);

  return { totalPassed, totalFailed, successTests, failedTests };
}

// 运行测试
runAllTests()
  .then((result) => {
    if (!result) {
      return;
    }
    const { totalFailed = 0, failedTests = 0 } = result;
    if (totalFailed > 0 || failedTests > 0) {
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

