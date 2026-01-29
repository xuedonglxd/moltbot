# 02 - CLI命令框架需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 01-配置系统需求
> **后续文档**: 03-依赖注入系统需求, 04-Gateway基础架构需求

---

## 1. 需求概述

### 1.1 目标描述

实现一个**可扩展、用户友好、功能完整**的命令行接口(CLI)框架,作为用户与 AI 助手系统交互的主要入口。该框架需要支持命令注册、参数解析、子命令嵌套、帮助文档生成等完整的 CLI 功能,并提供统一的错误处理和进度展示。

**核心目标:**
- **命令行入口**: 提供 `moltbot` CLI 命令作为系统的统一入口
- **命令注册机制**: 支持模块化注册命令,每个功能模块独立注册子命令
- **参数解析**: 支持选项(options)、标志(flags)、位置参数(arguments)的解析
- **帮助系统**: 自动生成命令帮助文档和使用示例
- **错误处理**: 统一的错误捕获和友好的错误提示

### 1.2 业务场景

#### 场景 1: 查看系统状态
**用户操作**: 用户想查看 Gateway 和渠道的运行状态。

**命令示例**:
```bash
moltbot status              # 查看基本状态
moltbot status --deep       # 深度探测渠道状态
moltbot status --all        # 显示所有详细信息
moltbot status --json       # 以 JSON 格式输出
```

**系统行为**:
1. 解析命令和选项
2. 加载配置
3. 查询 Gateway 状态
4. 探测渠道连接状态
5. 格式化输出结果(表格或 JSON)

#### 场景 2: 配置渠道
**用户操作**: 用户想添加 Telegram Bot。

**命令示例**:
```bash
moltbot channels add telegram --token <BOT_TOKEN>
```

**系统行为**:
1. 验证必需参数
2. 交互式提示缺失的配置
3. 更新配置文件
4. 验证配置有效性
5. 提示用户重启 Gateway

#### 场景 3: 运行 Agent
**用户操作**: 用户想在终端中直接与 Agent 对话。

**命令示例**:
```bash
moltbot agent --message "帮我写一个 Python 脚本"
moltbot agent --message "解释这段代码" --file code.py
moltbot agent --thinking high  # 启用详细思考过程显示
```

**系统行为**:
1. 解析消息和选项
2. 加载文件附件(如果指定)
3. 启动 Agent 执行
4. 流式输出 Agent 回复
5. 显示工具调用过程(如果启用 thinking 模式)

#### 场景 4: 诊断问题
**用户操作**: 系统出现问题,用户运行诊断命令。

**命令示例**:
```bash
moltbot doctor              # 运行完整诊断
moltbot doctor --yes        # 自动修复问题
```

**系统行为**:
1. 检查配置文件
2. 检查 Gateway 状态
3. 检查渠道连接
4. 检查依赖环境
5. 提供修复建议或自动修复

### 1.3 用户价值

- **统一入口**: 所有功能通过 `moltbot` 命令访问,降低学习成本
- **自文档化**: 内置帮助系统,用户可通过 `--help` 快速了解命令用法
- **交互友好**: 支持交互式提示、进度条、彩色输出
- **脚本友好**: 支持 `--json` 输出,便于脚本集成

---

## 2. 核心概念

### 2.1 CLI 程序结构

**定义**: CLI 程序是一个树形结构,包含根命令和多层嵌套的子命令。

**层次结构**:
```
moltbot                          # 根命令
├── agent                        # 子命令
│   ├── --message <text>        # 选项
│   ├── --file <path>           # 选项
│   └── --thinking <mode>       # 选项
├── agents                       # 子命令组
│   ├── list                    # 子命令
│   ├── add                     # 子命令
│   └── delete <id>             # 子命令(带位置参数)
├── channels                     # 子命令组
│   ├── status                  # 子命令
│   ├── add <type>              # 子命令(带位置参数)
│   └── delete <type>           # 子命令(带位置参数)
├── config                       # 子命令组
│   ├── get <key>               # 子命令
│   ├── set <key> <value>       # 子命令
│   └── edit                    # 子命令
├── gateway                      # 子命令组
│   ├── run                     # 子命令
│   ├── stop                    # 子命令
│   └── restart                 # 子命令
├── status                       # 子命令
│   ├── --deep                  # 标志
│   ├── --all                   # 标志
│   └── --json                  # 标志
├── health                       # 子命令
├── doctor                       # 子命令
├── setup                        # 子命令
├── configure                    # 子命令
└── onboard                      # 子命令
```

### 2.2 命令类型

#### 类型 1: 简单命令
**定义**: 无子命令,直接执行操作。

**示例**:
```bash
moltbot status
moltbot health
moltbot doctor
```

#### 类型 2: 命令组
**定义**: 包含多个子命令,需要指定子命令才能执行。

**示例**:
```bash
moltbot agents list
moltbot channels add telegram
moltbot config get logging.level
```

#### 类型 3: 交互式命令
**定义**: 启动交互式会话,用户通过问答完成配置。

**示例**:
```bash
moltbot setup       # 交互式初始化
moltbot configure   # 交互式配置向导
moltbot onboard     # 交互式入门引导
```

### 2.3 参数类型

#### 选项(Options)
**定义**: 以 `--` 或 `-` 开头的命名参数,可选或必需。

**示例**:
```bash
--message <text>    # 必需选项,需要值
--file <path>       # 可选选项,需要值
--thinking <mode>   # 可选选项,需要值(枚举:low/medium/high)
```

#### 标志(Flags)
**定义**: 布尔选项,无需值,存在即为 true。

**示例**:
```bash
--json              # 输出 JSON 格式
--deep              # 深度探测
--all               # 显示所有信息
--verbose, -v       # 详细输出(支持短格式)
--yes, -y           # 自动确认
```

#### 位置参数(Arguments)
**定义**: 无标记的参数,按顺序匹配。

**示例**:
```bash
moltbot config set logging.level info
#                  ^^^^^^^^^^^^^^  ^^^^
#                  参数1: key      参数2: value

moltbot agents delete main
#                     ^^^^
#                     参数1: agentId
```

### 2.4 命令注册

**定义**: 命令注册是将命令定义添加到 CLI 程序的过程。

**注册流程**:
```typescript
// 1. 定义命令注册函数
function registerAgentCommands(program: Command, ctx: ProgramContext) {
  program
    .command('agent')
    .description('Run an agent with a message')
    .option('--message <text>', 'Message to send')
    .option('--file <path>', 'File to attach')
    .option('--thinking <mode>', 'Thinking mode (low|medium|high)')
    .action(async (options) => {
      await agentCommand(options, ctx);
    });
}

// 2. 注册到命令注册表
const commandRegistry: CommandRegistration[] = [
  {
    id: 'agent',
    register: ({ program, ctx }) => registerAgentCommands(program, ctx)
  }
];

// 3. 批量注册所有命令
function registerProgramCommands(program: Command, ctx: ProgramContext) {
  for (const entry of commandRegistry) {
    entry.register({ program, ctx });
  }
}
```

### 2.5 程序上下文(ProgramContext)

**定义**: 程序上下文是在 CLI 启动时创建的共享状态,包含版本信息、渠道选项等。

**字段**:
```typescript
interface ProgramContext {
  programVersion: string;         // 程序版本(来自 package.json)
  channelOptions: string[];       // 可用渠道列表
  messageChannelOptions: string;  // 消息命令的渠道选项(格式化为字符串)
  agentChannelOptions: string;    // Agent 命令的渠道选项(格式化为字符串)
}
```

**用途**:
- 在帮助文档中显示版本号
- 在选项说明中显示可用渠道列表
- 在命令执行时访问共享状态

### 2.6 命令路由(Command Routing)

**定义**: 命令路由是快速匹配命令路径并执行对应处理器的机制,用于绕过 Commander 的解析开销。

**用途**: 对于性能敏感的命令(如 `status`, `health`),可以通过路由直接执行,避免完整的 CLI 解析。

**路由规则**:
```typescript
interface RouteSpec {
  match: (path: string[]) => boolean;  // 匹配函数
  loadPlugins?: boolean;                // 是否加载插件
  run: (argv: string[]) => Promise<boolean>; // 执行函数
}

const routeStatus: RouteSpec = {
  match: (path) => path[0] === 'status',
  loadPlugins: true,
  run: async (argv) => {
    const json = hasFlag(argv, '--json');
    const deep = hasFlag(argv, '--deep');
    await statusCommand({ json, deep }, defaultRuntime);
    return true;
  }
};
```

---

## 3. 功能需求

### 3.1 核心功能列表

#### P0 功能(必须实现)

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F01** | 根命令创建 | 创建 `moltbot` 根命令 |
| **F02** | 子命令注册 | 支持注册多层嵌套子命令 |
| **F03** | 选项和标志解析 | 解析 `--option <value>` 和 `--flag` |
| **F04** | 位置参数解析 | 解析无标记的位置参数 |
| **F05** | 命令执行(Action) | 执行命令对应的处理函数 |
| **F06** | 帮助文档生成 | 自动生成 `--help` 输出 |
| **F07** | 版本信息显示 | 支持 `--version` 显示版本号 |

#### P1 功能(重要)

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F08** | 命令注册表 | 模块化命令注册机制 |
| **F09** | 程序上下文 | 共享的程序上下文对象 |
| **F10** | 错误处理 | 统一的错误捕获和格式化输出 |
| **F11** | Pre-action Hooks | 命令执行前的钩子(如版本检查) |
| **F12** | 命令路由(快速路径) | 性能敏感命令的快速执行 |

#### P2 功能(可选)

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F13** | 自动补全 | Shell 自动补全支持 |
| **F14** | 命令别名 | 支持命令和选项的别名 |
| **F15** | 交互式提示 | 缺失参数时交互式提示 |

### 3.2 命令分类

#### 系统管理类

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `status` | 查看系统和渠道状态 | P0 |
| `health` | 健康检查 | P0 |
| `doctor` | 诊断和修复问题 | P1 |
| `setup` | 初始化系统 | P1 |
| `configure` | 配置向导 | P1 |
| `onboard` | 入门引导 | P2 |

#### Agent 管理类

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `agent` | 运行 Agent | P0 |
| `agents list` | 列出所有 Agent | P0 |
| `agents add` | 添加 Agent | P1 |
| `agents delete <id>` | 删除 Agent | P1 |

#### 渠道管理类

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `channels status` | 查看渠道状态 | P0 |
| `channels add <type>` | 添加渠道 | P1 |
| `channels delete <type>` | 删除渠道 | P1 |

#### 配置管理类

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `config get <key>` | 获取配置值 | P0 |
| `config set <key> <value>` | 设置配置值 | P0 |
| `config edit` | 编辑配置文件 | P1 |

#### Gateway 管理类

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `gateway run` | 启动 Gateway | P0 |
| `gateway stop` | 停止 Gateway | P1 |
| `gateway restart` | 重启 Gateway | P1 |

#### 消息类

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `message send` | 发送消息到渠道 | P1 |

#### 会话管理类

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `sessions` | 列出会话 | P1 |

---

## 4. 非功能需求

### 4.1 性能要求

| 指标 | 要求 | 测量方法 |
|------|------|---------|
| **CLI 启动时间** | < 500ms(冷启动) | 测量从执行到首次输出的时间 |
| **命令路由时间** | < 10ms | 测量路由匹配和参数解析时间 |
| **帮助文档生成** | < 100ms | 测量 `--help` 输出时间 |

### 4.2 可用性要求

| 要求 | 说明 |
|------|------|
| **一致的命令风格** | 所有命令遵循统一的命名和参数风格 |
| **友好的错误提示** | 错误信息包含问题描述和建议的修复方法 |
| **渐进式复杂度** | 简单任务使用简单命令,复杂任务提供高级选项 |
| **自文档化** | 每个命令都有清晰的描述和示例 |

### 4.3 可扩展性要求

| 要求 | 说明 |
|------|------|
| **模块化命令注册** | 每个功能模块独立注册命令,互不干扰 |
| **插件命令支持** | 插件可以动态注册新命令 |
| **命令组合** | 支持通过管道组合多个命令 |

---

## 5. 架构设计

### 5.1 技术选型

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| **Commander.js** | 12.x | CLI 框架 | 功能完整、社区活跃、TypeScript 支持好 |
| **@clack/prompts** | Latest | 交互式提示 | 美观的 UI、类型安全 |
| **osc-progress** | Latest | 进度展示 | 轻量级、支持 OSC 协议 |
| **Node.js process** | 内置 | 进程管理 | 原生支持、无依赖 |

### 5.2 设计模式

#### 模式 1: 注册表模式(Registry Pattern)

**用途**: 管理所有命令的注册逻辑。

**实现**:
```typescript
interface CommandRegistration {
  id: string;                              // 命令唯一 ID
  register: (params: RegisterParams) => void; // 注册函数
  routes?: RouteSpec[];                    // 可选的快速路由
}

const commandRegistry: CommandRegistration[] = [
  { id: 'agent', register: registerAgentCommands },
  { id: 'channels', register: registerChannelCommands },
  { id: 'config', register: registerConfigCommands },
  // ...
];

function registerProgramCommands(program: Command, ctx: ProgramContext) {
  for (const entry of commandRegistry) {
    entry.register({ program, ctx, argv: process.argv });
  }
}
```

**优点**:
- 各模块独立注册,低耦合
- 易于添加新命令
- 支持动态加载

#### 模式 2: 命令处理器模式(Command Handler Pattern)

**用途**: 将命令定义与执行逻辑分离。

**实现**:
```typescript
// 1. 命令处理器接口
interface CommandOptions {
  message?: string;
  file?: string;
  thinking?: 'low' | 'medium' | 'high';
}

async function agentCommand(
  options: CommandOptions,
  runtime: Runtime
): Promise<void> {
  // 命令执行逻辑
}

// 2. 命令定义
program
  .command('agent')
  .option('--message <text>')
  .option('--file <path>')
  .option('--thinking <mode>')
  .action(async (options) => {
    await agentCommand(options, defaultRuntime);
  });
```

**优点**:
- 命令逻辑可独立测试
- 支持依赖注入
- 易于重用

#### 模式 3: 上下文对象模式(Context Object Pattern)

**用途**: 在命令间共享状态和配置。

**实现**:
```typescript
interface ProgramContext {
  programVersion: string;
  channelOptions: string[];
  // ... 其他共享状态
}

function createProgramContext(): ProgramContext {
  return {
    programVersion: VERSION,
    channelOptions: resolveCliChannelOptions(),
  };
}

// 在命令注册时传递上下文
registerProgramCommands(program, ctx);
```

### 5.3 模块结构

```
src/
├── cli/
│   ├── program/
│   │   ├── build-program.ts      # CLI 程序构建器(主入口)
│   │   ├── context.ts            # 程序上下文创建
│   │   ├── command-registry.ts   # 命令注册表
│   │   ├── help.ts               # 帮助系统配置
│   │   ├── preaction.ts          # Pre-action 钩子
│   │   ├── register.agent.ts     # Agent 命令注册
│   │   ├── register.channels.ts  # 渠道命令注册
│   │   ├── register.config.ts    # 配置命令注册
│   │   ├── register.gateway.ts   # Gateway 命令注册
│   │   └── register.*.ts         # 其他命令注册
│   ├── deps.ts                   # 依赖注入(下一章)
│   ├── argv.ts                   # 参数解析工具
│   ├── prompt.ts                 # 交互式提示
│   ├── progress.ts               # 进度展示
│   └── wait.ts                   # 等待工具
├── commands/
│   ├── agent.ts                  # Agent 命令实现
│   ├── agents.ts                 # Agents 命令实现
│   ├── channels.ts               # Channels 命令实现
│   ├── config.ts                 # Config 命令实现
│   ├── status.ts                 # Status 命令实现
│   ├── health.ts                 # Health 命令实现
│   ├── doctor.ts                 # Doctor 命令实现
│   └── *.ts                      # 其他命令实现
└── index.ts                      # CLI 入口文件
```

### 5.4 接口定义

#### 接口 1: CommandRegistration

```typescript
interface CommandRegistration {
  /** 命令唯一标识符 */
  id: string;

  /** 注册函数 */
  register: (params: CommandRegisterParams) => void;

  /** 可选的快速路由规则 */
  routes?: RouteSpec[];
}

interface CommandRegisterParams {
  program: Command;           // Commander 程序对象
  ctx: ProgramContext;        // 程序上下文
  argv: string[];             // 命令行参数
}
```

#### 接口 2: RouteSpec

```typescript
interface RouteSpec {
  /** 路由匹配函数 */
  match: (path: string[]) => boolean;

  /** 是否需要加载插件 */
  loadPlugins?: boolean;

  /** 执行函数 */
  run: (argv: string[]) => Promise<boolean>;
}
```

#### 接口 3: ProgramContext

```typescript
interface ProgramContext {
  /** 程序版本号 */
  programVersion: string;

  /** 可用渠道列表 */
  channelOptions: string[];

  /** 消息命令的渠道选项(格式化字符串) */
  messageChannelOptions: string;

  /** Agent 命令的渠道选项(格式化字符串) */
  agentChannelOptions: string;
}
```

### 5.5 数据流图

```
┌──────────────────────────────────────────────────────────┐
│              用户执行命令: moltbot agent --message "hi"   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│          1. 入口文件(src/index.ts)                        │
│          - loadDotEnv()                                  │
│          - normalizeEnv()                                 │
│          - ensureMoltbotCliOnPath()                      │
│          - assertSupportedRuntime()                      │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│          2. 构建 CLI 程序(buildProgram)                   │
│          - 创建 Commander 实例                            │
│          - 创建程序上下文(createProgramContext)           │
│          - 配置帮助系统(configureProgramHelp)             │
│          - 注册 Pre-action 钩子(registerPreActionHooks)  │
│          - 注册所有命令(registerProgramCommands)         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│          3. 解析命令行参数(program.parseAsync)            │
│          - 匹配命令路径: "agent"                          │
│          - 解析选项: { message: "hi" }                   │
│          - 调用 action 回调                               │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│          4. 执行命令处理器(agentCommand)                  │
│          - 加载配置(loadConfig)                           │
│          - 创建依赖(createDefaultDeps)                    │
│          - 执行 Agent 逻辑                                │
│          - 输出结果                                       │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
                  命令完成
```

---

## 6. 关键实现

### 6.1 实现步骤

#### 步骤 1: 创建程序上下文(context.ts)

**目标**: 创建共享的程序上下文对象。

**伪代码**:
```typescript
import { VERSION } from '../../version.js';
import { resolveCliChannelOptions } from '../channel-options.js';

export interface ProgramContext {
  programVersion: string;
  channelOptions: string[];
  messageChannelOptions: string;
  agentChannelOptions: string;
}

export function createProgramContext(): ProgramContext {
  const channelOptions = resolveCliChannelOptions();
  return {
    programVersion: VERSION,
    channelOptions,
    messageChannelOptions: channelOptions.join('|'),
    agentChannelOptions: ['last', ...channelOptions].join('|'),
  };
}
```

#### 步骤 2: 定义命令注册表(command-registry.ts)

**目标**: 定义所有命令的注册入口。

**伪代码**:
```typescript
import type { Command } from 'commander';
import type { ProgramContext } from './context.js';

export interface CommandRegistration {
  id: string;
  register: (params: CommandRegisterParams) => void;
  routes?: RouteSpec[];
}

interface CommandRegisterParams {
  program: Command;
  ctx: ProgramContext;
  argv: string[];
}

export const commandRegistry: CommandRegistration[] = [
  {
    id: 'agent',
    register: ({ program, ctx }) => registerAgentCommands(program, ctx),
  },
  {
    id: 'agents',
    register: ({ program }) => registerAgentsCommands(program),
  },
  {
    id: 'channels',
    register: ({ program }) => registerChannelsCommands(program),
  },
  {
    id: 'config',
    register: ({ program }) => registerConfigCommands(program),
  },
  {
    id: 'status-health-sessions',
    register: ({ program }) => registerStatusHealthSessionsCommands(program),
    routes: [routeHealth, routeStatus, routeSessions], // 快速路由
  },
  // ... 其他命令
];

export function registerProgramCommands(
  program: Command,
  ctx: ProgramContext,
  argv: string[]
) {
  for (const entry of commandRegistry) {
    entry.register({ program, ctx, argv });
  }
}
```

#### 步骤 3: 实现命令注册函数(register.*.ts)

**目标**: 为每个功能模块实现命令注册逻辑。

**示例(Agent 命令)**:
```typescript
// register.agent.ts
import type { Command } from 'commander';
import { agentCommand } from '../../commands/agent.js';
import { defaultRuntime } from '../../runtime.js';

export function registerAgentCommands(
  program: Command,
  ctx: ProgramContext
) {
  program
    .command('agent')
    .description('Run an agent with a message')
    .option('--message <text>', 'Message to send to the agent')
    .option('--file <path>', 'File to attach')
    .option('--thinking <mode>', 'Thinking mode (low|medium|high)', 'low')
    .option('--agent <id>', 'Agent ID to use')
    .option('--channel <type>', `Channel to use (${ctx.agentChannelOptions})`)
    .action(async (options) => {
      try {
        await agentCommand(options, defaultRuntime);
      } catch (err) {
        console.error('Agent command failed:', err);
        process.exit(1);
      }
    });
}
```

#### 步骤 4: 实现命令处理器(commands/*.ts)

**目标**: 实现命令的具体执行逻辑。

**示例(Agent 命令处理器)**:
```typescript
// commands/agent.ts
interface AgentCommandOptions {
  message?: string;
  file?: string;
  thinking?: 'low' | 'medium' | 'high';
  agent?: string;
  channel?: string;
}

export async function agentCommand(
  options: AgentCommandOptions,
  runtime: Runtime
): Promise<void> {
  // 1. 验证必需参数
  if (!options.message) {
    throw new Error('--message is required');
  }

  // 2. 加载配置
  const cfg = runtime.loadConfig();

  // 3. 解析 Agent ID
  const agentId = options.agent ?? cfg.agents?.list?.[0]?.id ?? 'main';

  // 4. 加载文件附件(如果指定)
  let fileContent: string | undefined;
  if (options.file) {
    fileContent = await readFile(options.file, 'utf-8');
  }

  // 5. 运行 Agent
  const result = await runEmbeddedPiAgent({
    sessionId: generateSessionId(),
    sessionKey: `agent:${agentId}:cli`,
    agentId,
    prompt: options.message,
    fileAttachments: fileContent ? [{ content: fileContent }] : [],
    thinkingMode: options.thinking,
    // ...
  });

  // 6. 输出结果
  console.log(result.assistantReply);
}
```

#### 步骤 5: 构建 CLI 程序(build-program.ts)

**目标**: 组装所有组件,创建完整的 CLI 程序。

**伪代码**:
```typescript
import { Command } from 'commander';
import { createProgramContext } from './context.js';
import { registerProgramCommands } from './command-registry.js';
import { configureProgramHelp } from './help.js';
import { registerPreActionHooks } from './preaction.js';

export function buildProgram(): Command {
  const program = new Command();
  const ctx = createProgramContext();
  const argv = process.argv;

  // 1. 配置帮助系统
  configureProgramHelp(program, ctx);

  // 2. 注册 Pre-action 钩子(版本检查等)
  registerPreActionHooks(program, ctx.programVersion);

  // 3. 注册所有命令
  registerProgramCommands(program, ctx, argv);

  return program;
}
```

#### 步骤 6: 创建 CLI 入口(index.ts)

**目标**: 创建可执行的 CLI 入口文件。

**伪代码**:
```typescript
#!/usr/bin/env node
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// 1. 环境初始化
import { loadDotEnv } from './infra/dotenv.js';
import { normalizeEnv } from './infra/env.js';
import { ensureMoltbotCliOnPath } from './infra/path-env.js';
import { assertSupportedRuntime } from './infra/runtime-guard.js';
import { installUnhandledRejectionHandler } from './infra/unhandled-rejections.js';

loadDotEnv({ quiet: true });
normalizeEnv();
ensureMoltbotCliOnPath();
assertSupportedRuntime(); // 检查 Node 版本

// 2. 构建 CLI 程序
import { buildProgram } from './cli/program.js';
const program = buildProgram();

// 3. 全局错误处理
installUnhandledRejectionHandler();

process.on('uncaughtException', (error) => {
  console.error('[moltbot] Uncaught exception:', error);
  process.exit(1);
});

// 4. 解析并执行命令
if (isMainModule(import.meta.url)) {
  void program.parseAsync(process.argv).catch((err) => {
    console.error('[moltbot] CLI failed:', err);
    process.exit(1);
  });
}
```

#### 步骤 7: 配置 package.json

**目标**: 将 CLI 配置为可执行的二进制文件。

**配置**:
```json
{
  "name": "moltbot",
  "version": "2025.1.29",
  "bin": {
    "moltbot": "./dist/index.js"
  },
  "type": "module",
  "engines": {
    "node": ">=22.0.0"
  },
  "scripts": {
    "build": "tsc",
    "dev": "bun src/index.ts",
    "moltbot": "bun src/index.ts"
  }
}
```

### 6.2 技术难点

#### 难点 1: 命令快速路由与 Commander 解析的权衡

**问题**: 某些命令(如 `status`, `health`)需要快速执行,但 Commander 的完整解析有一定开销。

**解决方案**:
- 实现命令路由机制,绕过 Commander 解析
- 仅对性能敏感的命令启用快速路由
- 保留 Commander 解析作为后备方案

**实现**:
```typescript
export interface RouteSpec {
  match: (path: string[]) => boolean;
  loadPlugins?: boolean;
  run: (argv: string[]) => Promise<boolean>;
}

// 在入口文件中优先尝试快速路由
const commandPath = process.argv.slice(2);
const route = findRoutedCommand(commandPath);

if (route) {
  const success = await route.run(process.argv);
  if (success) {
    process.exit(0); // 快速路径成功
  }
}

// 快速路径失败,回退到 Commander 解析
await program.parseAsync(process.argv);
```

#### 难点 2: 交互式提示与非交互式模式的兼容

**问题**: CLI 需要同时支持交互式使用(人类)和脚本使用(自动化)。

**解决方案**:
- 使用 `--yes` 标志跳过所有提示
- 使用 `--json` 输出机器可读格式
- 检测 TTY,非 TTY 环境自动禁用交互

**实现**:
```typescript
async function prompt YesNo(message: string, defaultValue: boolean) {
  // 检查 --yes 标志
  if (hasFlag(process.argv, '--yes')) {
    return defaultValue;
  }

  // 检查是否在 TTY 环境
  if (!process.stdout.isTTY) {
    return defaultValue;
  }

  // 显示交互式提示
  return await confirm({ message, initialValue: defaultValue });
}
```

#### 难点 3: 命令注册的循环依赖

**问题**: 命令注册函数可能依赖其他模块,导致循环依赖。

**解决方案**:
- 将命令注册逻辑与命令实现分离
- 使用动态导入延迟加载命令实现
- 在注册时只注册命令定义,执行时才加载实现

**实现**:
```typescript
// register.agent.ts (注册逻辑)
export function registerAgentCommands(program: Command, ctx: ProgramContext) {
  program
    .command('agent')
    .description('Run an agent')
    .action(async (options) => {
      // 动态导入,避免循环依赖
      const { agentCommand } = await import('../../commands/agent.js');
      await agentCommand(options, defaultRuntime);
    });
}
```

### 6.3 测试策略

#### 单元测试

**测试覆盖**:
- 程序上下文创建
- 命令注册逻辑
- 参数解析工具
- 错误处理

**示例测试**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createProgramContext } from './context.js';
import { buildProgram } from './build-program.js';

describe('createProgramContext', () => {
  it('should create context with version', () => {
    const ctx = createProgramContext();
    expect(ctx.programVersion).toMatch(/\d{4}\.\d{1,2}\.\d{1,2}/);
  });

  it('should include channel options', () => {
    const ctx = createProgramContext();
    expect(ctx.channelOptions).toContain('whatsapp');
    expect(ctx.channelOptions).toContain('telegram');
  });
});

describe('buildProgram', () => {
  it('should register all commands', () => {
    const program = buildProgram();
    const commands = program.commands.map(cmd => cmd.name());

    expect(commands).toContain('agent');
    expect(commands).toContain('agents');
    expect(commands).toContain('channels');
    expect(commands).toContain('config');
    expect(commands).toContain('status');
  });
});
```

#### 集成测试

**测试场景**:
- 完整的命令执行流程
- 错误处理和退出码
- 帮助文档生成

### 6.4 参考代码位置

| 功能 | Moltbot 代码位置 |
|------|-----------------|
| 程序构建 | `src/cli/program/build-program.ts:7-18` |
| 程序上下文 | `src/cli/program/context.ts:11-19` |
| 命令注册表 | `src/cli/program/command-registry.ts:106-165` |
| CLI 入口 | `src/index.ts:1-94` |
| Agent 命令 | `src/commands/agent.ts` |
| 依赖注入 | `src/cli/deps.ts:18-27` |

---

## 7. 验收标准

### 7.1 功能验收

#### 验收项 1: 基本命令执行

**测试步骤**:
1. 执行 `moltbot --version`
2. 验证输出版本号
3. 执行 `moltbot --help`
4. 验证输出帮助文档

**通过标准**:
- 版本号正确显示
- 帮助文档包含所有注册的命令

#### 验收项 2: 子命令执行

**测试步骤**:
1. 执行 `moltbot agent --message "test"`
2. 验证 Agent 正常执行
3. 执行 `moltbot agents list`
4. 验证输出 Agent 列表

**通过标准**:
- 命令成功执行
- 输出符合预期

#### 验收项 3: 错误处理

**测试步骤**:
1. 执行 `moltbot agent` (缺少必需参数)
2. 验证错误提示
3. 执行 `moltbot unknown-command`
4. 验证"未知命令"提示

**通过标准**:
- 错误信息清晰
- 提供修复建议
- 退出码非 0

### 7.2 性能验收

| 指标 | 测量结果 | 是否通过 |
|------|---------|---------|
| CLI 启动时间 | < 500ms | ✓ |
| 命令路由时间 | < 10ms | ✓ |
| 帮助生成时间 | < 100ms | ✓ |

### 7.3 测试覆盖

**要求**: 测试覆盖率 ≥ 70%

**覆盖范围**:
- 程序构建逻辑
- 命令注册逻辑
- 参数解析工具
- 错误处理

---

## 8. 附录

### 8.1 命令清单

#### 系统管理类

```bash
moltbot status [--deep] [--all] [--json]
moltbot health [--json] [--timeout <ms>]
moltbot doctor [--yes]
moltbot setup
moltbot configure
moltbot onboard
```

#### Agent 管理类

```bash
moltbot agent --message <text> [--file <path>] [--thinking <mode>]
moltbot agents list [--json] [--bindings]
moltbot agents add <id> --name <name> [--provider <provider>]
moltbot agents delete <id>
```

#### 渠道管理类

```bash
moltbot channels status [--deep] [--json]
moltbot channels add <type> [options...]
moltbot channels delete <type>
```

#### 配置管理类

```bash
moltbot config get <key>
moltbot config set <key> <value>
moltbot config edit
```

#### Gateway 管理类

```bash
moltbot gateway run [--port <port>] [--bind <mode>]
moltbot gateway stop
moltbot gateway restart
```

### 8.2 常用选项说明

| 选项 | 说明 | 适用命令 |
|------|------|---------|
| `--json` | 输出 JSON 格式 | 大部分查询命令 |
| `--verbose, -v` | 详细输出 | 所有命令 |
| `--yes, -y` | 自动确认 | 交互式命令 |
| `--help, -h` | 显示帮助 | 所有命令 |
| `--version` | 显示版本 | 根命令 |
| `--timeout <ms>` | 超时时间 | 网络相关命令 |

---

**文档完成** ✅

下一步: 实现 CLI 命令框架代码,并编写单元测试。
