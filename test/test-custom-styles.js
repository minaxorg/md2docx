import md2docx from '../src/md2docx/index.js';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

function analyzeDocx(filePath, buffer) {
  const zipFile = filePath.replace('.docx', '.zip');
  const extractDir = filePath.replace('.docx', '-extracted');

  fs.copyFileSync(filePath, zipFile);
  if (fs.existsSync(extractDir)) {
    fs.rmSync(extractDir, { recursive: true, force: true });
  }
  execSync(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${extractDir}'"`, { stdio: 'ignore' });

  const stylesXml = fs.readFileSync(path.join(extractDir, 'word', 'styles.xml'), 'utf-8');
  const documentXml = fs.readFileSync(path.join(extractDir, 'word', 'document.xml'), 'utf-8');

  const defaultSizeMatch = stylesXml.match(/<w:docDefaults>.*?<w:sz w:val="(\d+)"\/>/s);
  const defaultSize = defaultSizeMatch ? parseInt(defaultSizeMatch[1], 10) : undefined;

  const headingFontSizes = {};
  for (let level = 1; level <= 6; level += 1) {
    const key = `h${level}`;
    let size;

    // 1️⃣ 优先读取 Heading1..Heading6（运行时真正使用的样式）
    const headingMatch = stylesXml.match(
      new RegExp(
        `<w:style[^>]*w:styleId="Heading${level}"[^>]*>.*?<w:rPr>.*?<w:sz w:val="(\\d+)"`,
        's'
      )
    );
    if (headingMatch) {
      size = parseInt(headingMatch[1], 10);
    } else {
      // 2️⃣ 兼容旧模板：回退读取 styleId="1".."6"
      const legacyMatch = stylesXml.match(
        new RegExp(
          `<w:style[^>]*w:styleId="${level}"[^>]*>.*?<w:rPr>.*?<w:sz w:val="(\\d+)"`,
          's'
        )
      );
      size = legacyMatch ? parseInt(legacyMatch[1], 10) : undefined;
    }

    headingFontSizes[key] = size;
  }

  const paragraphCount = (documentXml.match(/<w:p>/g) || []).length;

  fs.unlinkSync(zipFile);
  fs.rmSync(extractDir, { recursive: true, force: true });

  return {
    defaultSize,
    defaultPt: defaultSize !== undefined ? defaultSize / 2 : undefined,
    headingFontSizes,
    paragraphCount,
    sizeKb: buffer.length / 1024,
  };
}

async function testCustomStyles() {
  console.log('='.repeat(70));
  console.log('样式配置测试（styleOptions & stylesXML）');
  console.log('='.repeat(70));

  const markdown = `# 一级标题

这是普通段落文本，应该使用默认字体大小。

## 二级标题

这是另一个段落，**包含加粗**和*斜体*文本。

- 列表项 1
- 列表项 2

\`\`\`
代码块内容
\`\`\`

> 引用块内容`;

  const customStylesXML = fs.readFileSync('./test/test-styles.xml', 'utf-8');

  const outputDir = 'test/output';
  fs.mkdirSync(outputDir, { recursive: true });
  const timestamp = Date.now();

  const scenarios = [
    {
      name: '默认样式',
      description: '无配置，使用模板默认 22 半磅',
      slug: 'default',
      options: {},
      expectations: {
        defaultFontSize: 22,
        headingFontSizes: { h1: 40, h2: 32 },
      },
    },
    {
      name: '空 styleOptions',
      description: 'styleOptions = {}，应与默认一致',
      slug: 'empty-style-options',
      options: { styleOptions: {} },
      expectations: {
        defaultFontSize: 22,
        headingFontSizes: { h1: 40, h2: 32 },
      },
    },
    {
      name: '仅默认字体',
      description: 'styleOptions.defaultFontSize = 18 (9pt)',
      slug: 'default-font-only',
      options: { styleOptions: { defaultFontSize: 18 } },
      expectations: {
        defaultFontSize: 18,
        headingFontSizes: { h1: 40, h2: 32 },
      },
    },
    {
      name: '仅部分标题',
      description: 'styleOptions.headingFontSizes.h2 = 44',
      slug: 'heading-h2-only',
      options: { styleOptions: { headingFontSizes: { h2: 44 } } },
      expectations: {
        defaultFontSize: 22,
        headingFontSizes: { h1: 40, h2: 44 },
      },
    },
    {
      name: '默认+标题组合',
      description: 'defaultFontSize = 18, headingFontSizes.h1=36, h2=32',
      slug: 'default-and-headings',
      options: { styleOptions: { defaultFontSize: 18, headingFontSizes: { h1: 36, h2: 32 } } },
      expectations: {
        defaultFontSize: 18,
        headingFontSizes: { h1: 36, h2: 32 },
      },
    },
    {
      name: '自定义 styles.xml',
      description: '直接传入 stylesXML（12pt）',
      slug: 'custom-xml',
      options: { stylesXML: customStylesXML },
      expectations: {
        defaultFontSize: 24,
        headingFontSizes: { h1: 48, h2: 40 },
      },
    },
    {
      name: '空 headingFontSizes',
      description: 'styleOptions.headingFontSizes = {}，应不改变标题',
      slug: 'empty-headings',
      options: { styleOptions: { defaultFontSize: 18, headingFontSizes: {} } },
      expectations: {
        defaultFontSize: 18,
        headingFontSizes: { h1: 40, h2: 32 },
      },
    },
  ];

  const reports = [];

  for (const scenario of scenarios) {
    console.log('\n' + '-'.repeat(70));
    console.log(`测试: ${scenario.name}`);
    console.log(`说明: ${scenario.description}`);

    const buffer = await md2docx(markdown, scenario.options);
    const docxPath = `${outputDir}/${scenario.slug}-${timestamp}.docx`;
    fs.writeFileSync(docxPath, buffer);
    console.log('✓ 生成文件:', docxPath);

    const analysis = analyzeDocx(docxPath, buffer);

    const checks = [];
    let pass = true;

    const expectedDefault = scenario.expectations?.defaultFontSize;
    if (expectedDefault !== undefined) {
      const actual = analysis.defaultSize;
      const ok = actual === expectedDefault;
      checks.push({ label: '默认字体大小', expected: expectedDefault, actual, ok });
      if (!ok) pass = false;
    }

    const expectedHeadings = scenario.expectations?.headingFontSizes || {};
    for (const [key, expected] of Object.entries(expectedHeadings)) {
      const actual = analysis.headingFontSizes[key];
      const ok = actual === expected;
      checks.push({ label: `${key.toUpperCase()} 字体大小`, expected, actual, ok });
      if (!ok) pass = false;
    }

    reports.push({
      ...scenario,
      file: docxPath,
      bufferSize: analysis.sizeKb,
      paragraphCount: analysis.paragraphCount,
      defaultSize: analysis.defaultSize,
      defaultPt: analysis.defaultPt,
      headingFontSizes: analysis.headingFontSizes,
      checks,
      pass,
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('测试结果汇总');
  console.log('='.repeat(70));

  let passed = 0;
  reports.forEach((report, index) => {
    const status = report.pass ? '✓ 通过' : '✗ 失败';
    if (report.pass) passed += 1;
    console.log(`\n${index + 1}. ${report.name} —— ${status}`);
    console.log(`   默认字体: ${report.defaultSize ?? '未找到'} 半磅 (${report.defaultPt ?? '?'}pt)`);
    for (const check of report.checks) {
      console.log(`   ${check.label}: 实际 ${check.actual ?? '未找到'}, 期望 ${check.expected} ${check.ok ? '✓' : '✗'}`);
    }
    console.log(`   段落数: ${report.paragraphCount}`);
    console.log(`   文件大小: ${report.bufferSize.toFixed(2)} KB`);
    console.log(`   输出文件: ${report.file}`);
  });

  console.log('\n最终结论:');
  console.log(`  ${passed}/${reports.length} 个场景通过测试`);
  console.log('='.repeat(70));
}

(async () => {
  try {
    await testCustomStyles();
  } catch (err) {
    console.error('测试执行失败:', err);
    process.exitCode = 1;
  }
})();

