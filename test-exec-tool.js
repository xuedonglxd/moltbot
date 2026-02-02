#!/usr/bin/env node
/**
 * 测试 Moltbot exec 工具
 * 这个脚本直接调用 Moltbot 的 exec 工具来执行命令
 */

import { execTool } from './src/agents/bash-tools.exec.js';
import { createDefaultDeps } from './src/infra/deps.js';

async function testExecTool() {
  console.log('🦞 测试 Moltbot exec 工具\n');

  // 创建依赖注入容器
  const deps = await createDefaultDeps();

  // 创建工具上下文
  const context = {
    deps,
    agentId: 'test-agent',
    sessionKey: 'test-session',
    workspaceDir: process.cwd(),
    execTarget: 'host', // 在本地主机执行
  };

  // 测试 1: 简单命令
  console.log('测试 1: 执行简单命令 (echo)');
  try {
    const result1 = await execTool.execute(
      { command: 'echo "Hello from Moltbot exec tool!"' },
      context
    );
    console.log('✅ 成功');
    console.log('输出:', result1.stdout.trim());
    console.log('退出码:', result1.exitCode);
    console.log();
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  // 测试 2: Git 状态
  console.log('测试 2: 执行 git status');
  try {
    const result2 = await execTool.execute(
      { command: 'git status --short' },
      context
    );
    console.log('✅ 成功');
    console.log('输出:');
    console.log(result2.stdout || '(工作树干净)');
    console.log();
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  // 测试 3: 多行脚本
  console.log('测试 3: 执行多行脚本');
  try {
    const result3 = await execTool.execute(
      {
        command: `
          echo "=== 系统信息 ==="
          uname -a
          echo ""
          echo "=== Node 版本 ==="
          node --version
          echo ""
          echo "=== 当前目录 ==="
          pwd
        `
      },
      context
    );
    console.log('✅ 成功');
    console.log('输出:');
    console.log(result3.stdout);
    console.log();
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  // 测试 4: 后台执行
  console.log('测试 4: 后台执行 (sleep 命令)');
  try {
    const result4 = await execTool.execute(
      {
        command: 'sleep 5 && echo "后台任务完成"',
        background: true,
        yieldMs: 2000  // 等待 2 秒
      },
      context
    );
    console.log('✅ 成功');
    console.log('进程 ID:', result4.pid);
    console.log('是否后台运行:', result4.backgrounded);
    console.log();
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  // 测试 5: 工作目录
  console.log('测试 5: 指定工作目录');
  try {
    const result5 = await execTool.execute(
      {
        command: 'ls -la | head -5',
        workingDirectory: '/tmp'
      },
      context
    );
    console.log('✅ 成功');
    console.log('输出:');
    console.log(result5.stdout);
    console.log();
  } catch (error) {
    console.error('❌ 失败:', error.message);
  }

  console.log('🎉 所有测试完成！');

  // 清理
  await deps.shutdown?.();
  process.exit(0);
}

// 运行测试
testExecTool().catch(error => {
  console.error('测试失败:', error);
  process.exit(1);
});
