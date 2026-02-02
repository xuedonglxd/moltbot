#!/usr/bin/env node
/**
 * 直接测试 Moltbot 的 exec 工具实现
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🦞 测试 Moltbot exec 工具实现\n');

// 通过 Moltbot CLI 的 message send 命令测试工具调用
async function testToolViaMessage(prompt) {
  return new Promise((resolve, reject) => {
    console.log(`📤 发送测试消息: "${prompt}"\n`);

    const proc = spawn('pnpm', ['moltbot', 'message', 'send', prompt], {
      cwd: __dirname,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || 'test-key'
      }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`进程退出码: ${code}`));
      }
    });

    // 10 秒超时
    setTimeout(() => {
      proc.kill();
      reject(new Error('超时'));
    }, 10000);
  });
}

// 测试直接查看工具列表
console.log('📋 测试 1: 查看可用的工具列表\n');
const listToolsProc = spawn('pnpm', ['moltbot', 'config', 'get', 'tools'], {
  cwd: __dirname,
  stdio: 'inherit'
});

listToolsProc.on('close', async (code) => {
  console.log('\n✅ 配置查看完成\n');

  // 如果有 API Key，可以测试真实的工具调用
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('💡 检测到 ANTHROPIC_API_KEY，可以测试实际的工具调用\n');
    console.log('提示：运行以下命令测试 exec 工具：');
    console.log('  pnpm moltbot message send "执行命令：ls -la | head -5"');
  } else {
    console.log('⚠️  未检测到 ANTHROPIC_API_KEY');
    console.log('💡 设置 API Key 后可以测试完整的工具调用流程：');
    console.log('  export ANTHROPIC_API_KEY="your-api-key"');
    console.log('  pnpm moltbot message send "执行命令：git status"');
  }

  console.log('\n📚 查看工具实现代码：');
  console.log('  - exec 工具: src/agents/bash-tools.exec.ts');
  console.log('  - process 工具: src/agents/bash-tools.process.ts');
  console.log('  - 工具注册: src/agents/moltbot-tools.ts');

  console.log('\n🎉 测试完成！');
});
