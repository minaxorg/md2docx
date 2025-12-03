import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 运行所有测试的主脚本
 */
async function runAllTests() {
  console.log('='.repeat(70));
  console.log('md2docx 完整测试套件');
  console.log('='.repeat(70));
  console.log('');

  const testDir = path.resolve(process.cwd(), 'test');
  const outputDir = path.join(testDir, 'output');

  // 清理旧的输出文件
  console.log('清理旧的测试输出...');
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
    console.log('✓ 已清理 test/output/\n');
  }

  const results = {
    suite: null,
    existing: null,
    styles: null,
    list: null,
  };

  // 运行测试套件
  console.log('1. 运行功能测试套件 (test-suite.js)...');
  console.log('-'.repeat(70));
  try {
    execSync('node test/test-suite.js', { stdio: 'inherit' });
    results.suite = { success: true };
  } catch (error) {
    console.error('✗ 测试套件运行失败');
    results.suite = { success: false, error: error.message };
  }

  console.log('\n');

  // 运行自定义样式测试
  console.log('2. 运行样式配置测试 (test-custom-styles.js)...');
  console.log('-'.repeat(70));
  try {
    execSync('node test/test-custom-styles.js', { stdio: 'inherit' });
    results.styles = { success: true };
  } catch (error) {
    console.error('✗ 样式配置测试运行失败');
    results.styles = { success: false, error: error.message };
  }

  console.log('\n');

  // 运行现有文件测试
  console.log('3. 运行现有文件测试 (test-existing-files.js)...');
  console.log('-'.repeat(70));
  try {
    execSync('node test/test-existing-files.js', { stdio: 'inherit' });
    results.existing = { success: true };
  } catch (error) {
    console.error('✗ 现有文件测试运行失败');
    results.existing = { success: false, error: error.message };
  }

  console.log('\n');

  // 运行列表功能测试
  console.log('4. 运行列表功能测试 (testList.js --list-test)...');
  console.log('-'.repeat(70));
  try {
    execSync('node test/testList.js --list-test', { stdio: 'inherit' });
    results.list = { success: true };
  } catch (error) {
    console.error('✗ 列表功能测试运行失败');
    results.list = { success: false, error: error.message };
  }

  // 总结
  console.log('\n');
  console.log('='.repeat(70));
  console.log('测试完成');
  console.log('='.repeat(70));

  const allSuccess = results.suite?.success && results.styles?.success && results.existing?.success && results.list?.success;

  if (allSuccess) {
    console.log('✓ 所有测试通过！');
  } else {
    console.log('✗ 部分测试失败');
    if (!results.suite?.success) {
      console.log('  - 功能测试套件失败');
    }
    if (!results.styles?.success) {
      console.log('  - 样式配置测试失败');
    }
    if (!results.existing?.success) {
      console.log('  - 现有文件测试失败');
    }
    if (!results.list?.success) {
      console.log('  - 列表功能测试失败');
    }
  }

  console.log(`\n输出文件位于: ${outputDir}`);
  console.log('\n清理命令:');
  console.log('  Remove-Item test\\output -Recurse -Force');
}

// 运行
runAllTests().catch(console.error);

