# Moltbot 操作 CLI 工具的实现机制与交互流程

## 概述

Moltbot **完全具备**操作 CLI 工具的能力，其实现机制甚至比 Claude Code 更加灵活和强大。本文档详细说明 Moltbot 如何通过其工具系统执行 Shell 命令、管理进程，以及如何扩展新的 CLI 集成能力。

---

## 核心能力对比

| 能力 | Moltbot | Claude Code |
|------|---------|-------------|
| **执行 Shell 命令** | ✅ `exec` 工具 | ✅ `Bash` 工具 |
| **后台进程管理** | ✅ `process` 工具（list/tail/kill/write） | ✅ `TaskOutput`/`TaskStop` |
| **交互式 CLI** | ✅ PTY 模式 + stdin 写入 | ⚠️ 有限支持 |
| **沙箱执行** | ✅ Docker 沙箱 + remote node | ⚠️ 有限隔离 |
| **多环境支持** | ✅ host/sandbox/remote | ❌ 仅本地 |
| **权限控制** | ✅ 9 层策略系统 + ask 模式 | ⚠️ 基础权限提示 |
| **工具扩展** | ✅ 插件系统 | ❌ 不可扩展 |
| **多渠道访问** | ✅ Telegram/Discord/Slack/WhatsApp | ❌ 仅 CLI |

---

## 一、核心工具：`exec`

### 1.1 工具定义

位置：`src/agents/bash-tools.exec.ts`

```typescript
{
  name: "exec",
  description: "Execute a shell command and return its output...",
  parameters: Type.Object({
    command: Type.String({ description: "The shell command to execute" }),
    env: Type.Optional(Type.Record(Type.String(), Type.String())),
    timeout: Type.Optional(Type.Number()),
    yieldMs: Type.Optional(Type.Number()),
    background: Type.Optional(Type.Boolean()),
    pty: Type.Optional(Type.Boolean()),
    // ... 更多参数
  }),
  execute: async (params, context) => { /* ... */ }
}
```

### 1.2 核心参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `command` | string | Shell 命令（单行或多行脚本） | `"npm test"` |
| `env` | Record<string, string> | 环境变量覆盖 | `{ NODE_ENV: "test" }` |
| `timeout` | number | 超时时间（毫秒），默认 120000 | `60000` |
| `yieldMs` | number | 后台执行前等待时间（毫秒） | `5000` |
| `background` | boolean | 是否后台执行 | `true` |
| `pty` | boolean | 是否使用伪终端（支持交互式 CLI） | `true` |
| `workingDirectory` | string | 工作目录（相对或绝对路径） | `"./packages/core"` |

### 1.3 执行环境

通过 `context.execTarget` 控制执行位置：

- **`host`**（默认）：在主机上执行
- **`sandbox`**：在 Docker 沙箱中执行（自动挂载 workspace）
- **`remote`**：在远程 node 上执行（通过 `config.nodes.remote.endpoint` 配置）

### 1.4 安全机制

#### 策略级别（`config.tools.exec.security`）：

- **`deny`**：禁止执行
- **`allowlist`**：仅允许白名单命令（`config.tools.exec.allowlist`）
- **`full`**（默认）：允许所有命令

#### Ask 模式（`config.tools.exec.ask`）：

- **`off`**：不询问用户
- **`on-miss`**：白名单未命中时询问
- **`always`**：每次都询问

#### 示例配置：

```yaml
tools:
  exec:
    security: allowlist
    allowlist:
      - "git status"
      - "npm test"
      - "pnpm build"
    ask: on-miss
```

### 1.5 返回值结构

```typescript
{
  pid: number,           // 进程 ID
  exitCode: number | null,
  stdout: string,
  stderr: string,
  truncated: boolean,    // 是否截断输出（超过 maxOutputChars）
  backgrounded: boolean  // 是否转为后台执行
}
```

---

## 二、进程管理：`process` 工具

### 2.1 工具定义

位置：`src/agents/bash-tools.process.ts`

子命令：
- **`list`**：列出所有后台进程
- **`tail`**：查看进程输出（最近 N 行）
- **`kill`**：终止进程
- **`write`**：向进程 stdin 写入数据（支持交互式 CLI）

### 2.2 典型用例

#### 启动后台服务：

```typescript
{
  tool: "exec",
  input: {
    command: "npm run dev",
    background: true
  }
}
// 返回: { pid: 12345, backgrounded: true }
```

#### 查看进程列表：

```typescript
{
  tool: "process",
  input: { subcommand: "list" }
}
// 返回: [{ pid: 12345, command: "npm run dev", running: true }]
```

#### 查看进程输出：

```typescript
{
  tool: "process",
  input: { subcommand: "tail", pid: 12345, lines: 50 }
}
// 返回: { stdout: "...", stderr: "...", exitCode: null }
```

#### 向交互式 CLI 发送输入：

```typescript
{
  tool: "process",
  input: {
    subcommand: "write",
    pid: 12345,
    data: "yes\n"
  }
}
```

### 2.3 进程隔离

- **Session 隔离**：每个 agent session 有独立的进程作用域（`scopeKey`）
- **跨 session 访问**：可通过配置启用全局进程池

---

## 三、交互流程示例

### 3.1 单次命令执行

```
User: "查看当前 Git 状态"
  ↓
Agent: 调用 exec 工具
  {
    tool: "exec",
    input: {
      command: "git status --short"
    }
  }
  ↓
Moltbot 执行引擎:
  1. 检查工具权限（tool policy）
  2. 检查 exec 安全策略（allowlist）
  3. 如需要，弹出 ask 确认
  4. 在指定环境（host/sandbox/remote）执行命令
  5. 捕获 stdout/stderr/exitCode
  6. 返回结果给 Agent
  ↓
Agent: 解析结果并回复用户
  "当前有 3 个未暂存的修改文件：..."
```

### 3.2 后台进程 + 输出监控

```
User: "启动开发服务器并持续监控日志"
  ↓
Agent Step 1: 启动后台服务
  {
    tool: "exec",
    input: {
      command: "npm run dev",
      background: true,
      yieldMs: 3000  // 等待 3 秒观察启动日志
    }
  }
  返回: { pid: 12345, backgrounded: true }
  ↓
Agent Step 2: 定期查看输出
  {
    tool: "process",
    input: {
      subcommand: "tail",
      pid: 12345,
      lines: 20
    }
  }
  返回: { stdout: "Server started on port 3000\n..." }
  ↓
Agent: 通知用户
  "开发服务器已启动（PID 12345），监听端口 3000"
```

### 3.3 交互式 CLI 操作

```
User: "运行交互式测试工具并选择第 2 个选项"
  ↓
Agent Step 1: 以 PTY 模式启动
  {
    tool: "exec",
    input: {
      command: "npx jest --watch",
      pty: true,
      background: true
    }
  }
  返回: { pid: 12345, backgrounded: true }
  ↓
Agent Step 2: 等待提示符出现（通过 tail 观察）
  {
    tool: "process",
    input: { subcommand: "tail", pid: 12345, lines: 10 }
  }
  返回: { stdout: "... Press 'a' to run all tests ..." }
  ↓
Agent Step 3: 发送键盘输入
  {
    tool: "process",
    input: {
      subcommand: "write",
      pid: 12345,
      data: "2\n"  // 选择选项 2 并按回车
    }
  }
  ↓
Agent Step 4: 查看执行结果
  {
    tool: "process",
    input: { subcommand: "tail", pid: 12345, lines: 30 }
  }
  返回: { stdout: "... Test suite passed ..." }
```

---

## 四、与 Claude Code 的集成方式

### 4.1 方案一：Skill 封装（推荐）

通过 AgentSkills 封装 Claude Code 的常用操作模式：

**示例 Skill**（`skills/claude-code-compat.md`）：

```markdown
---
name: claude-code-compat
description: Provides Claude Code compatible tool aliases
user-invocable: false
---

## Tool Mapping

When the user asks to perform file operations or shell commands,
you can use the following tools as Claude Code equivalents:

- **Bash** → `exec` tool
  - Parameters: `{ command: string, timeout?: number }`
  - Returns: `{ stdout, stderr, exitCode }`

- **Read** → `read` tool
  - Parameters: `{ path: string, start?: number, end?: number }`
  - Returns: `{ content: string }`

- **Write** → `write` tool
  - Parameters: `{ path: string, content: string }`

- **Edit** → `edit` tool
  - Parameters: `{ path: string, blocks: Array<{ old, new }> }`

## Example Usage

User: "Run the test suite"
Action:
{
  tool: "exec",
  input: { command: "npm test" }
}
```

加载配置（`config.yaml`）：

```yaml
skills:
  load:
    extraDirs:
      - /path/to/skills
```

### 4.2 方案二：工具别名插件

创建插件提供 Claude Code 风格的工具别名：

**插件文件**（`plugins/claude-code-compat/moltbot.plugin.ts`）：

```typescript
import { type MoltbotPluginDefinition } from "moltbot/plugin-sdk";

export const plugin: MoltbotPluginDefinition = {
  id: "claude-code-compat",
  name: "Claude Code Compatibility",
  register: (api) => {
    // 注册 Bash 工具（映射到 exec）
    api.registerTool({
      name: "Bash",
      description: "Execute a bash command (Claude Code compatible)",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The command to execute" },
          description: { type: "string", description: "Command description" },
          timeout: { type: "number", description: "Timeout in ms" },
        },
        required: ["command"],
      },
      execute: async (params, context) => {
        // 调用底层 exec 工具
        const result = await context.callTool("exec", {
          command: params.command,
          timeout: params.timeout,
        });

        return {
          success: result.exitCode === 0,
          output: result.stdout,
          error: result.stderr,
        };
      },
    });

    // 类似地注册其他别名工具...
  },
};
```

### 4.3 方案三：消息渠道桥接（终极方案）

将 Moltbot 作为 **Claude Code 的远程执行后端**：

#### 架构：

```
Claude Code (CLI)
  ↓ HTTP/WebSocket
Moltbot Gateway (Web UI)
  ↓ WebSocket
Moltbot Agent
  ↓ exec/process 工具
Host/Sandbox/Remote Node
```

#### 实现步骤：

1. **在 Moltbot 中启动 Gateway**：
   ```bash
   moltbot gateway run --bind 0.0.0.0 --port 18789
   ```

2. **创建 Claude Code 集成渠道插件**：
   - 注册 HTTP API endpoint：`POST /api/claude-code/execute`
   - 接收 Claude Code 的工具调用请求（JSON 格式）
   - 路由到对应的 Moltbot 工具（exec/read/write/edit 等）
   - 返回执行结果

3. **在 Claude Code 侧配置自定义 MCP Server**：
   - 实现 MCP 协议的 tool handler
   - 转发请求到 Moltbot Gateway
   - 接收并返回结果

#### 示例插件代码片段：

```typescript
// plugins/claude-code-bridge/moltbot.plugin.ts
export const plugin: MoltbotPluginDefinition = {
  id: "claude-code-bridge",
  name: "Claude Code Bridge",
  register: (api) => {
    api.registerHttpRoute("POST", "/api/claude-code/execute", async (req, res) => {
      const { tool, input } = req.body;

      // 映射工具名称
      const toolMap: Record<string, string> = {
        Bash: "exec",
        Read: "read",
        Write: "write",
        Edit: "edit",
      };

      const moltbotTool = toolMap[tool] || tool;

      // 调用 Moltbot 工具
      const result = await api.callTool(moltbotTool, input);

      res.json({ success: true, result });
    });
  },
};
```

---

## 五、实际应用场景

### 5.1 通过 Telegram 远程执行命令

```
[Telegram 消息]
User: "@moltbot 在服务器上拉取最新代码并重启服务"
  ↓
Moltbot Agent (Telegram 渠道):
  1. exec: "cd /opt/myapp && git pull"
  2. exec: "systemctl restart myapp"
  3. process tail: 查看启动日志
  ↓
[Telegram 回复]
"已拉取最新提交 (abc123)，服务重启成功，日志正常"
```

### 5.2 多环境测试流水线

```
User: "在沙箱中运行完整测试套件"
  ↓
Agent:
  1. exec (sandbox): "pnpm install"
  2. exec (sandbox): "pnpm build"
  3. exec (sandbox): "pnpm test" (background=true)
  4. process tail: 监控测试输出
  5. exec (sandbox): "pnpm test:e2e"
  ↓
"测试通过（67/67），代码覆盖率 82%"
```

### 5.3 交互式调试助手

```
User: "启动 Node.js REPL 并执行几个表达式"
  ↓
Agent:
  1. exec (pty=true, background=true): "node"
  2. process write: "const sum = (a, b) => a + b\n"
  3. process tail: 读取 REPL 输出
  4. process write: "sum(2, 3)\n"
  5. process tail: 读取计算结果
  6. process kill: 退出 REPL
  ↓
"REPL 执行结果：sum(2, 3) = 5"
```

---

## 六、权限控制最佳实践

### 6.1 多层策略示例

```yaml
# config.yaml
tools:
  # 全局 exec 策略
  exec:
    security: allowlist
    allowlist:
      - "git *"
      - "npm *"
      - "pnpm *"
      - "bun *"
    ask: on-miss

  # 全局工具策略
  profile: coding  # 启用 fs + runtime 工具组
  deny:
    - "web_search"  # 禁用网络搜索

agents:
  # 特定 agent 策略
  telegram-bot-123:
    tools:
      allow:
        - "exec"  # 仅允许 exec
      deny:
        - "write"  # 禁止写文件

  # 高权限 agent
  admin-agent:
    tools:
      profile: full  # 启用所有工具
      exec:
        security: full  # 不限制命令
        ask: off
```

### 6.2 渠道特定策略

```yaml
routing:
  groups:
    - id: public-telegram
      match:
        channel: telegram
        groupId: "-1001234567890"
      settings:
        agents:
          tools:
            # 公开群组仅允许只读操作
            profile: minimal
            allow:
              - "read"
              - "ls"
            deny:
              - "exec"
              - "write"

    - id: private-admin
      match:
        channel: telegram
        sender: "@admin_user"
      settings:
        agents:
          tools:
            # 管理员全权限
            profile: full
            exec:
              security: full
```

---

## 七、扩展开发指南

### 7.1 创建自定义 CLI 工具封装

**场景**：封装 `kubectl` 操作

```typescript
// plugins/kubectl/kubectl-tool.ts
import { Type } from "@sinclair/typebox";
import type { AgentTool } from "@mariozechner/pi-agent-core";

export const kubectlTool: AgentTool<any, unknown> = {
  name: "kubectl",
  description: "Execute Kubernetes kubectl commands",
  parameters: Type.Object({
    subcommand: Type.String({
      description: "kubectl subcommand (get, describe, logs, etc.)"
    }),
    resource: Type.Optional(Type.String({ description: "Resource type (pod, deployment, etc.)" })),
    name: Type.Optional(Type.String({ description: "Resource name" })),
    namespace: Type.Optional(Type.String({ description: "Kubernetes namespace" })),
    extraArgs: Type.Optional(Type.String({ description: "Additional arguments" })),
  }),

  execute: async (params, context) => {
    // 构建 kubectl 命令
    const cmd = [
      "kubectl",
      params.subcommand,
      params.resource,
      params.name,
      params.namespace ? `-n ${params.namespace}` : "",
      params.extraArgs || "",
    ]
      .filter(Boolean)
      .join(" ");

    // 调用 exec 工具
    const result = await context.callTool("exec", {
      command: cmd,
      timeout: 30000,
    });

    if (result.exitCode !== 0) {
      throw new Error(`kubectl failed: ${result.stderr}`);
    }

    return {
      output: result.stdout,
      resource: params.resource,
      name: params.name,
    };
  },
};
```

**插件注册**：

```typescript
// plugins/kubectl/moltbot.plugin.ts
export const plugin: MoltbotPluginDefinition = {
  id: "kubectl",
  name: "Kubernetes kubectl Tool",
  register: (api) => {
    api.registerTool(kubectlTool);
  },
};
```

### 7.2 创建工具链（Tool Chain）

**场景**：Git 操作工具链

```typescript
// plugins/git-chain/git-tools.ts
export const gitStatusTool: AgentTool<any, unknown> = {
  name: "git_status",
  description: "Get detailed git repository status",
  parameters: Type.Object({
    verbose: Type.Optional(Type.Boolean()),
  }),
  execute: async (params, context) => {
    const commands = [
      "git status --short",
      "git log -1 --oneline",
      "git branch --show-current",
    ];

    const results = await Promise.all(
      commands.map(cmd => context.callTool("exec", { command: cmd }))
    );

    return {
      status: results[0].stdout,
      lastCommit: results[1].stdout,
      branch: results[2].stdout.trim(),
    };
  },
};

export const gitCommitTool: AgentTool<any, unknown> = {
  name: "git_commit",
  description: "Stage changes and create a commit",
  parameters: Type.Object({
    message: Type.String({ description: "Commit message" }),
    files: Type.Optional(Type.Array(Type.String())),
  }),
  execute: async (params, context) => {
    // Stage files
    const addCmd = params.files?.length
      ? `git add ${params.files.join(" ")}`
      : "git add -A";

    await context.callTool("exec", { command: addCmd });

    // Commit
    const commitCmd = `git commit -m "${params.message.replace(/"/g, '\\"')}"`;
    const result = await context.callTool("exec", { command: commitCmd });

    return {
      success: result.exitCode === 0,
      output: result.stdout,
    };
  },
};
```

---

## 八、性能优化建议

### 8.1 命令批处理

**不推荐**（多次工具调用）：

```typescript
await callTool("exec", { command: "git status" });
await callTool("exec", { command: "git log -1" });
await callTool("exec", { command: "git branch" });
```

**推荐**（单次脚本执行）：

```typescript
await callTool("exec", {
  command: `
    echo "=== Status ==="
    git status --short
    echo "=== Last Commit ==="
    git log -1 --oneline
    echo "=== Branch ==="
    git branch --show-current
  `,
});
```

### 8.2 输出截断配置

```yaml
tools:
  exec:
    maxOutputChars: 50000  # 默认 100000
    maxStderrChars: 10000  # 默认 10000
```

### 8.3 后台任务使用

对于长时间运行的命令（如 `npm install`、`docker build`），使用后台模式：

```typescript
{
  tool: "exec",
  input: {
    command: "npm install",
    background: true,
    yieldMs: 10000  // 前 10 秒输出立即返回
  }
}
```

---

## 九、故障排查

### 9.1 命令执行失败

**问题**：`exec` 工具返回 `exitCode: 1`

**排查步骤**：
1. 检查 `stderr` 输出
2. 验证工作目录（`workingDirectory`）
3. 检查环境变量（`env`）
4. 尝试在主机上手动执行命令

### 9.2 权限被拒绝

**问题**：工具调用返回 "Tool denied by policy"

**排查步骤**：
1. 检查全局工具策略（`config.tools.profile`）
2. 检查 agent 特定策略（`config.agents.<id>.tools`）
3. 检查 exec 安全策略（`config.tools.exec.security`）
4. 查看日志（`~/.clawdbot/logs/`）

### 9.3 进程无法找到

**问题**：`process tail` 返回 "Process not found"

**可能原因**：
- 进程已退出
- Session 隔离导致进程在不同作用域
- Agent 重启清空了进程注册表

**解决方案**：
- 检查 `process list` 输出
- 使用 `exec` 重新启动后台任务
- 配置进程持久化（TODO：实现持久化插件）

---

## 十、总结

### Moltbot 操作 CLI 工具的核心优势：

1. **完整的 Shell 能力**：通过 `exec` + `process` 工具实现与 Claude Code 等价的命令执行
2. **多环境支持**：可在 host/sandbox/remote 三种环境无缝切换
3. **细粒度权限控制**：9 层策略系统 + ask 模式，适合多用户/多渠道场景
4. **可扩展性**：通过插件系统可封装任意 CLI 工具（kubectl、terraform、aws-cli 等）
5. **多渠道访问**：可通过 Telegram/Discord/Slack 等消息平台远程执行命令
6. **交互式支持**：PTY 模式 + stdin 写入支持交互式 CLI（如 REPL、交互式安装器）

### 推荐使用方式：

- **开发者本地使用**：直接调用 `exec` 工具（类似 Claude Code）
- **团队协作场景**：通过消息渠道 + 权限控制安全执行
- **CI/CD 集成**：作为 Claude Code 的远程执行后端
- **运维自动化**：封装常用运维工具为高级 Agent 工具

### 下一步行动：

1. 阅读现有工具实现：`src/agents/bash-tools.*.ts`
2. 尝试编写自定义工具插件：参考 `extensions/` 目录示例
3. 配置多环境执行：设置 Docker 沙箱或 remote node
4. 集成到 CI/CD：探索与 GitHub Actions 或 Jenkins 的集成
