import md2docx from '../src/md2docx/index.js';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

/**
 * 测试现有的 Markdown 文件
 */
async function testFile(inputFile, expectedFeatures) {
  const fileName = path.basename(inputFile, '.md');
  console.log(`\n${'='.repeat(70)}`);
  console.log(`测试文件: ${inputFile}`);
  console.log(`${'='.repeat(70)}`);

  try {
    // 读取 Markdown 文件
    const markdown = fs.readFileSync(inputFile, 'utf-8');
    console.log(`文件大小: ${markdown.length} 字符`);

    // 转换为 DOCX
    const result = await md2docx(markdown, {});

    // 保存输出（统一到 test/output 目录）
    const testDir = path.resolve(process.cwd(), 'test');
    const outputDir = path.join(testDir, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, `${fileName}-output.docx`);
    const zipFile = path.join(outputDir, `${fileName}-output.zip`);
    const extractDir = path.join(outputDir, `${fileName}-extracted`);

    fs.writeFileSync(outputFile, result);
    fs.writeFileSync(zipFile, result);

    console.log(`✓ 转换成功`);
    console.log(`输出文件: ${outputFile}`);

    // 解压并校验
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true });
    }
    execSync(`powershell -Command "Expand-Archive -Path '${zipFile}' -DestinationPath '${extractDir}'"`, { stdio: 'ignore' });

    const xmlPath = path.join(extractDir, 'word', 'document.xml');
    const xml = fs.readFileSync(xmlPath, 'utf-8');

    // 基本统计
    console.log(`\n基本统计:`);
    console.log(`  段落数: ${(xml.match(/<w:p>/g) || []).length}`);
    console.log(`  表格数: ${(xml.match(/<w:tbl>/g) || []).length}`);
    console.log(`  图片数: ${(xml.match(/<w:drawing>/g) || []).length}`);

    // 特性检测
    if (expectedFeatures && expectedFeatures.length > 0) {
      console.log(`\n特性检测:`);
      expectedFeatures.forEach(feature => {
        const exists = xml.includes(feature.pattern);
        const passed = feature.negate ? !exists : exists;
        const status = passed ? '✓' : '✗';
        console.log(`  ${status} ${feature.description}`);
      });
    }

    // 清理临时文件
    fs.unlinkSync(zipFile);
    fs.rmSync(extractDir, { recursive: true, force: true });

    return { success: true, outputFile };

  } catch (error) {
    console.error(`\n❌ 测试失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 运行所有文件测试
 */
async function runAllFileTests() {
  console.log('开始测试现有 Markdown 文件...\n');

  const testDir = path.join(process.cwd(), 'test');

  // 测试配置
  const tests = [
    {
      file: path.join(testDir, 'testfont.md'),
      features: [
        { pattern: 'Heading2', description: '包含 H2 标题' },
        { pattern: '0000FF', description: '包含蓝色文本' },
        { pattern: 'FF0000', description: '包含红色删除线' },
        { pattern: '<w:strike', description: '包含删除线' },
        { pattern: 'firstLine="22pt"', description: '包含首行缩进' },
      ]
    },
    {
      file: path.join(testDir, 'testLayout.md'),
      features: [
        { pattern: '<w:tbl>', description: '包含表格' },
        { pattern: 'Heading2', description: '包含标题' },
        { pattern: 'FFFFFF', description: '包含白色背景' },
        { pattern: 'F4CCCD', description: '表格无表头（需检查）', negate: true },
      ]
    },
    {
      file: path.join(testDir, 'test.md'),
      features: [
        { pattern: 'Heading1', description: '包含 H1 标题' },
        { pattern: '<w:color', description: '包含颜色' },
        { pattern: '<w:tbl>', description: '包含表格' },
        { pattern: '<w:hyperlink', description: '包含超链接' },
        { pattern: '<w:drawing>', description: '包含图片' },
        { pattern: 'w:val="center"', description: '包含居中对齐' },
      ]
    },
  ];

  const results = [];

  for (const test of tests) {
    if (!fs.existsSync(test.file)) {
      console.log(`\n⚠️  文件不存在: ${test.file}`);
      continue;
    }

    const result = await testFile(test.file, test.features);
    results.push({ file: test.file, ...result });
  }

  // 总结
  console.log(`\n${'='.repeat(70)}`);
  console.log('测试总结');
  console.log(`${'='.repeat(70)}`);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`总文件数: ${results.length}`);
  console.log(`✓ 成功: ${successCount}`);
  console.log(`✗ 失败: ${failCount}`);

  if (failCount > 0) {
    console.log(`\n失败的文件:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${path.basename(r.file)}: ${r.error}`);
    });
  }

  console.log(`\n所有输出文件位于: test/output/`);
}

// 运行测试
runAllFileTests().catch(console.error);

