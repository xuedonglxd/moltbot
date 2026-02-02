#!/usr/bin/env node
/**
 * 快速测试 Moltbot CLI 工具能力
 */

import { execSync } from 'child_process';

console.log('🦞 Moltbot CLI 工具能力测试\n');

// 测试 1: 通过 exec 工具执行简单命令
console.log('📝 测试 1: 执行 echo 命令');
console.log('命令: echo "Hello from Moltbot!"');
try {
  const result = execSync('echo "Hello from Moltbot!"', { encoding: 'utf-8' });
  console.log('✅ 输出:', result.trim());
} catch (error) {
  console.error('❌ 失败:', error.message);
}
console.log();

// 测试 2: Git 操作
console.log('📝 测试 2: Git 状态检查');
console.log('命令: git status --short');
try {
  const result = execSync('git status --short', { encoding: 'utf-8', cwd: process.cwd() });
  console.log('✅ 输出:');
  console.log(result || '  (工作树干净)');
} catch (error) {
  console.error('❌ 失败:', error.message);
}
console.log();

// 测试 3: 系统信息
console.log('📝 测试 3: 获取系统信息');
console.log('命令: uname -s && node --version');
try {
  const os = execSync('uname -s', { encoding: 'utf-8' }).trim();
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  console.log('✅ 操作系统:', os);
  console.log('✅ Node 版本:', nodeVersion);
} catch (error) {
  console.error('❌ 失败:', error.message);
}
console.log();

// 测试 4: 文件列表
console.log('📝 测试 4: 列出当前目录文件');
console.log('命令: ls -la | head -10');
try {
  const result = execSync('ls -la | head -10', { encoding: 'utf-8' });
  console.log('✅ 输出:');
  console.log(result);
} catch (error) {
  console.error('❌ 失败:', error.message);
}

// 测试 5: 查看 Moltbot 版本
console.log('📝 测试 5: Moltbot 版本');
console.log('命令: pnpm moltbot --version');
try {
  const result = execSync('pnpm moltbot --version', { encoding: 'utf-8', cwd: process.cwd() });
  console.log('✅ 输出:', result.trim());
} catch (error) {
  console.error('❌ 失败:', error.message);
}
console.log();

console.log('🎉 测试完成！这演示了 Moltbot exec 工具可以执行的命令类型。');
console.log('\n💡 提示：Moltbot 的 exec 工具提供了类似能力，但增加了：');
console.log('   - 权限控制（白名单/黑名单）');
console.log('   - 多环境支持（host/sandbox/remote）');
console.log('   - 后台进程管理');
console.log('   - PTY 支持（交互式 CLI）');
