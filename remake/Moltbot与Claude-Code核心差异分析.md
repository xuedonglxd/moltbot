# Moltbot 与 Claude Code 核心差异分析

> **版本**: v1.0
> **创建时间**: 2026-01-29
> **作者**: Claude Sonnet 4.5

---

## 执行摘要

Moltbot 和 Claude Code 虽然都是基于 Claude AI 的工具，但它们的**产品定位、架构设计、会话管理和上下文处理**存在根本性差异。

**核心差异总结:**
- **产品形态**: Moltbot 是多渠道个人助手 vs Claude Code 是开发工具 CLI
- **会话模型**: Moltbot 支持多会话并发 vs Claude Code 单会话交互
- **上下文管理**: Moltbot 持久化长期记忆 vs Claude Code 项目级临时上下文
- **工具集**: Moltbot 生活+设备工具 vs Claude Code 开发+IDE 工具

---

## 1. 产品定位差异

### 1.1 Moltbot - 个人 AI 助手

**定位**: 运行在个人设备上的**全渠道 AI 助手**

**核心特性**:
- **多渠道集成**: 支持 WhatsApp、Telegram、Slack、Discord、Signal、iMessage 等 10+ 个消息平台
- **常驻服务**: Gateway 守护进程常驻运行，24/7 响应消息
- **个人化**: 单用户设计，深度个性化配置（SOUL.md、AGENTS.md）
- **设备控制**: 支持 macOS/iOS/Android 设备本地操作（摄像头、通知、语音）

**典型使用场景**:
```
用户通过 WhatsApp 发送: "帮我总结今天的邮件"
Moltbot 通过 Gateway 接收 → 调用 Gmail 工具 → 返回摘要到 WhatsApp
```

### 1.2 Claude Code - 开发工具 CLI

**定位**: 面向开发者的**命令行编码助手**

**核心特性**:
- **项目集成**: 在代码仓库中运行，自动理解项目结构
- **开发工具**: 专注代码编写、重构、调试、测试
- **IDE 集成**: 直接与 VS Code、终端工具交互
- **临时会话**: 每次对话针对当前项目/任务

**典型使用场景**:
```bash
$ claude-code "帮我重构这个函数，使用 TypeScript 严格模式"
Claude Code 读取当前文件 → 分析代码 → 生成改进建议 → 写入文件
```

### 1.3 对比表

| 维度 | Moltbot | Claude Code |
|------|---------|-------------|
| **用户群体** | 个人用户（任何场景） | 开发者（编码场景） |
| **运行模式** | 守护进程（常驻） | 命令行工具（按需） |
| **集成渠道** | 10+ 消息平台 | 终端 + IDE |
| **使用时长** | 长期持续使用 | 按项目/任务使用 |
| **记忆范围** | 跨渠道长期记忆 | 单项目上下文 |

---

## 2. 会话管理差异

### 2.1 Moltbot - 多会话并发模型

#### 会话隔离策略

Moltbot 使用**多会话并发模型**，每个会话由 `sessionKey` 唯一标识：

```typescript
// 会话 Key 格式
agent:<agentId>:main                          // DM 主会话
agent:<agentId>:telegram:group:123            // Telegram 群组
agent:<agentId>:whatsapp:dm:+1234567890       // WhatsApp DM
cron:daily-summary                            // 定时任务会话
```

**关键特性**:
1. **会话隔离**: 每个聊天（DM、群组、频道）拥有独立的会话和上下文
2. **并发处理**: 可同时处理来自不同渠道的多个对话
3. **持久化存储**: 会话转录存储在 `~/.clawdbot/agents/<agentId>/sessions/<SessionId>.jsonl`
4. **会话元数据**: 记录 `origin`（来源渠道）、`displayName`、`updatedAt` 等

#### 会话生命周期

```json5
{
  "session": {
    "dmScope": "main",           // DM 合并到主会话
    "reset": {
      "mode": "daily",           // 每日重置
      "atHour": 4,               // 凌晨 4 点
      "idleMinutes": 120         // 或 2 小时空闲
    },
    "resetByType": {
      "group": { "mode": "idle", "idleMinutes": 120 },
      "dm": { "mode": "daily", "atHour": 4 }
    }
  }
}
```

**会话重置触发**:
- 时间触发: 每日固定时间（默认 4AM）
- 空闲触发: 超过配置的空闲时间
- 手动触发: `/new` 或 `/reset` 命令

#### 会话示例

**场景**: 用户同时在 3 个渠道与 Moltbot 对话

```
┌─────────────────────────────────────────────┐
│           Moltbot Gateway                   │
│  ws://127.0.0.1:18789                       │
└──────────────┬──────────────────────────────┘
               │
      ┌────────┼────────┐
      │        │        │
   WhatsApp Telegram Slack
      │        │        │
   Session1 Session2 Session3
   (main)   (group)  (dm)
```

每个会话维护:
- 独立的消息历史
- 独立的 token 计数
- 独立的工具调用记录
- 独立的模型配置（可选）

### 2.2 Claude Code - 单会话交互模型

Claude Code 使用**单会话线性交互模型**：

**关键特性**:
1. **单一对话**: 每次运行一个会话，聚焦当前任务
2. **项目上下文**: 自动加载当前目录的代码库上下文
3. **临时性**: 会话结束后上下文不持久化（除非明确保存）
4. **无并发**: 不需要处理多个对话源

#### 工作流程

```
用户输入 → Claude Code 加载项目上下文 → 执行任务 → 返回结果 → 会话结束
```

**示例**:
```bash
$ cd /path/to/project
$ claude-code "重构 user.ts 文件"
[Claude Code 读取 user.ts 及相关文件]
[生成重构建议]
[写入更改]
会话结束
```

### 2.3 会话对比

| 维度 | Moltbot | Claude Code |
|------|---------|-------------|
| **会话数量** | 多会话并发（数十/数百） | 单会话（一次一个） |
| **会话隔离** | 严格隔离（按渠道/群组/用户） | 按项目目录隔离 |
| **会话持久化** | 长期持久化（JSONL） | 临时（会话内） |
| **会话重置** | 可配置（时间/空闲/手动） | 自动（每次运行） |
| **并发处理** | 支持（队列+锁） | 不需要 |

---

## 3. 上下文管理差异

### 3.1 Moltbot - 持久化长期记忆

#### 上下文来源

Moltbot 的上下文由多个层级组成：

```
┌─────────────────────────────────────────────┐
│ 1. Bootstrap 文件（启动时注入）             │
│    - AGENTS.md   : 操作指令 + 记忆           │
│    - SOUL.md     : 人格设定                  │
│    - TOOLS.md    : 工具使用指南              │
│    - USER.md     : 用户信息                  │
│    - IDENTITY.md : Agent 身份               │
├─────────────────────────────────────────────┤
│ 2. 会话历史（持久化）                        │
│    - 存储在 JSONL 文件                       │
│    - 包含所有消息、工具调用、结果            │
│    - 跨设备/跨渠道共享（main 会话）          │
├─────────────────────────────────────────────┤
│ 3. 技能上下文（Skills）                      │
│    - ~/clawd/skills/<skill>/SKILL.md        │
│    - 动态加载的工具文档                      │
├─────────────────────────────────────────────┤
│ 4. 会话元数据                                │
│    - origin, displayName, channel           │
│    - inputTokens, outputTokens              │
└─────────────────────────────────────────────┘
```

#### 长期记忆机制

**AGENTS.md 示例**:
```markdown
# Memory

- 2026-01-15: User prefers coffee in the morning
- 2026-01-20: User's timezone is PST
- 2026-01-25: User asked to be reminded about dentist appointment on Feb 1
```

**特性**:
- **跨会话记忆**: 用户在 WhatsApp 告诉的偏好，在 Telegram 也生效
- **手动编辑**: 用户可直接编辑 AGENTS.md 添加记忆
- **自动更新**: Agent 可通过 `write_file` 工具更新记忆

#### 上下文修剪策略

Moltbot 使用**智能修剪**避免上下文溢出：

```typescript
// 修剪策略
1. 保留最近的用户消息
2. 移除旧的工具调用结果（保留工具调用本身）
3. 必要时触发自动压缩（Compaction）
```

**自动压缩（Compaction）**:
```
用户: [100 轮对话后]
Moltbot: [检测到上下文接近限制]
         → 自动运行压缩 turn
         → 生成摘要写入 AGENTS.md
         → 清理旧消息
```

### 3.2 Claude Code - 项目级临时上下文

#### 上下文来源

Claude Code 的上下文专注于**当前代码库**：

```
┌─────────────────────────────────────────────┐
│ 1. 项目指令文件                              │
│    - CLAUDE.md (项目根目录)                  │
│    - 包含项目特定的开发规范                  │
├─────────────────────────────────────────────┤
│ 2. 代码库上下文                              │
│    - 通过 Glob/Grep 工具搜索                 │
│    - 读取相关源文件                          │
│    - 分析依赖关系                            │
├─────────────────────────────────────────────┤
│ 3. 会话上下文（当前任务）                    │
│    - 用户的问题/任务描述                     │
│    - 之前步骤的中间结果                      │
│    - 工具调用历史                            │
├─────────────────────────────────────────────┤
│ 4. 系统提示（固定）                          │
│    - 开发最佳实践                            │
│    - 代码风格指南                            │
│    - 工具使用说明                            │
└─────────────────────────────────────────────┘
```

**CLAUDE.md 示例**:
```markdown
# Repository Guidelines

- Language: TypeScript (ESM)
- Formatting: Oxfmt
- Testing: Vitest
- Keep files under 700 LOC
- Use existing patterns for CLI options
```

#### 上下文特性

1. **项目绑定**: 上下文随项目目录变化
2. **按需加载**: 只加载任务相关的文件
3. **无长期记忆**: 不记住用户偏好/历史任务
4. **自动总结**: 长对话自动压缩历史上下文

#### 上下文示例

**场景**: 用户要求重构代码

```
Claude Code 上下文构建:
1. 读取 CLAUDE.md 获取项目规范
2. 使用 Glob 找到相关文件 (*.ts)
3. 使用 Read 读取目标文件和依赖
4. 分析代码结构
5. 生成重构建议

上下文内容:
- CLAUDE.md: ~5KB
- 相关源文件: ~50KB
- 会话历史: ~10KB
总计: ~65KB
```

### 3.3 上下文对比

| 维度 | Moltbot | Claude Code |
|------|---------|-------------|
| **上下文范围** | 跨渠道全局 | 单项目局部 |
| **持久化** | 长期（JSONL + Workspace） | 临时（会话内） |
| **记忆类型** | 个人偏好、历史对话 | 代码库结构、任务上下文 |
| **上下文来源** | Bootstrap + Session + Skills | CLAUDE.md + Codebase |
| **修剪策略** | 智能修剪 + Compaction | 自动总结 |
| **跨会话共享** | 是（main 会话） | 否（每次重新加载） |

---

## 4. 特殊上下文处理

### 4.1 Moltbot - Pre-Compaction Memory Flush

**场景**: 会话接近上下文限制时

```
┌─────────────────────────────────────────────┐
│ 1. 检测上下文使用率 > 80%                    │
│ 2. 触发 Memory Flush turn                   │
│    - 系统提示: "写下重要信息到 AGENTS.md"    │
│    - Agent 自动整理记忆                      │
│    - 写入持久化文件                          │
│ 3. 清理旧消息                                │
│ 4. 继续正常对话                              │
└─────────────────────────────────────────────┘
```

**示例**:
```
[上下文 85% 满]
System: 请将重要信息写入 AGENTS.md 以便长期保存
Agent: [write_file] 更新 AGENTS.md
       - 添加用户今天讨论的项目需求
       - 添加用户提到的会议时间
[上下文清理后降至 40%]
继续对话...
```

### 4.2 Claude Code - 自动上下文总结

**场景**: 长任务中的上下文管理

```
┌─────────────────────────────────────────────┐
│ 1. 检测对话轮次 > 阈值                       │
│ 2. 自动生成总结                              │
│    - 提取任务目标                            │
│    - 总结已完成步骤                          │
│    - 记录待办事项                            │
│ 3. 用总结替换旧上下文                        │
│ 4. 继续任务                                  │
└─────────────────────────────────────────────┘
```

**示例**:
```
[20 轮对话后]
Claude Code 内部总结:
"用户要求重构认证模块，已完成:
 1. 分离认证逻辑到独立文件
 2. 添加单元测试
 待办: 更新文档"

[用旧对话替换为总结]
继续下一步...
```

---

## 5. 工具集差异

### 5.1 Moltbot 工具

**分类**: 生活助手 + 设备控制

```typescript
// 消息发送工具
message_send({
  to: "+1234567890",
  message: "提醒: 明天开会",
  channel: "whatsapp"
})

// 设备控制工具
camera_snap({
  nodeId: "iphone",
  save: true
})

// 系统工具
system_notify({
  title: "任务完成",
  body: "文件已下载"
})

// 浏览器工具
browser_navigate({
  url: "https://example.com"
})

// 跨会话工具
sessions_send({
  targetSessionKey: "agent:main:telegram:group:123",
  message: "通知群组"
})
```

**特点**:
- **设备本地化**: 调用本机摄像头、通知、文件系统
- **跨渠道通信**: 可从 Telegram 发送 WhatsApp 消息
- **持久化操作**: 写入本地文件、设置定时任务

### 5.2 Claude Code 工具

**分类**: 开发工具 + IDE 集成

```typescript
// 文件搜索工具
Glob({
  pattern: "**/*.ts"
})

// 内容搜索工具
Grep({
  pattern: "function authenticate",
  output_mode: "content"
})

// 文件读取工具
Read({
  file_path: "/path/to/file.ts"
})

// 文件编辑工具
Edit({
  file_path: "/path/to/file.ts",
  old_string: "old code",
  new_string: "new code"
})

// 命令执行工具
Bash({
  command: "npm test",
  description: "Run tests"
})

// Task 工具（子 Agent）
Task({
  subagent_type: "Explore",
  prompt: "找到所有 API 端点"
})
```

**特点**:
- **开发专注**: 所有工具围绕代码编写/分析
- **批量操作**: 可并行搜索/读取多个文件
- **精确编辑**: 基于字符串匹配的精确替换

### 5.3 工具对比

| 维度 | Moltbot | Claude Code |
|------|---------|-------------|
| **工具数量** | 50+ 工具 | 15+ 核心工具 |
| **工具分类** | 生活+通信+设备 | 开发+编辑+搜索 |
| **跨平台能力** | 支持（iOS/Android/macOS） | 不需要（命令行） |
| **外部集成** | 消息平台 API | Git/npm/IDE |
| **持久化操作** | 多（文件/定时任务） | 少（主要读写代码） |

---

## 6. 架构对比

### 6.1 Moltbot 架构

```
┌───────────────────────────────────────────────────────┐
│                  Moltbot Gateway                      │
│              (ws://127.0.0.1:18789)                   │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Session Manager                             │    │
│  │  - 管理多个并发会话                          │    │
│  │  - 会话隔离和路由                            │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Channel Adapters                            │    │
│  │  - WhatsApp (Baileys)                        │    │
│  │  - Telegram (grammY)                         │    │
│  │  - Slack (Bolt)                              │    │
│  │  - Discord (discord.js)                      │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Agent Runtime (Pi-embedded)                 │    │
│  │  - 工具执行                                   │    │
│  │  - 上下文管理                                 │    │
│  │  - 流式响应                                   │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Storage Layer                               │    │
│  │  - JSONL 转录                                │    │
│  │  - Workspace 文件                            │    │
│  │  - 认证凭证                                   │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
    WhatsApp         Telegram          Slack
    (用户 A)         (群组 B)          (用户 C)
```

**关键点**:
1. **单一 Gateway**: 所有渠道通过一个 Gateway 处理
2. **会话隔离**: 每个渠道/群组独立会话
3. **持久化存储**: 所有对话持久化到 JSONL
4. **WebSocket API**: 客户端通过 WebSocket 控制

### 6.2 Claude Code 架构

```
┌───────────────────────────────────────────────────────┐
│               Claude Code CLI                         │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Session Manager (Simple)                    │    │
│  │  - 单一会话                                   │    │
│  │  - 项目上下文加载                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Tool Execution                              │    │
│  │  - File Operations (Read/Edit/Write)        │    │
│  │  - Search Tools (Glob/Grep)                 │    │
│  │  - Bash Execution                           │    │
│  │  - Sub-Agents (Task)                        │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Context Builder                             │    │
│  │  - 加载 CLAUDE.md                            │    │
│  │  - 搜索相关代码文件                           │    │
│  │  - 构建项目上下文                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  API Client                                  │    │
│  │  - 调用 Claude API                           │    │
│  │  - 流式响应处理                               │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────┘
         │
         ▼
    Terminal Output
    (用户看到结果)
```

**关键点**:
1. **简单架构**: 直接 CLI 工具，无守护进程
2. **项目绑定**: 上下文基于当前目录
3. **临时性**: 会话结束即销毁
4. **直接 API 调用**: 无中间层

---

## 7. 使用场景对比

### 7.1 Moltbot 典型场景

#### 场景 1: 跨渠道消息管理
```
用户在 WhatsApp: "帮我发个消息给 Telegram 开发群，说我晚点到"
Moltbot: [调用 sessions_send 工具]
         → 发送到 Telegram 群组
         "收到，已通知开发群"
```

#### 场景 2: 设备控制
```
用户在 Slack: "拍一张我桌面的照片"
Moltbot: [调用 camera_snap 工具]
         → 触发 iPhone 摄像头
         → 上传照片到 Slack
         "照片已拍摄"
```

#### 场景 3: 定时任务
```
用户: "每天早上 8 点提醒我查看邮件"
Moltbot: [创建 Cron Job]
         → 每天 8:00 触发
         → 发送提醒到 WhatsApp
```

### 7.2 Claude Code 典型场景

#### 场景 1: 代码重构
```bash
$ claude-code "重构 auth.ts，分离认证逻辑"
[Claude Code 读取 auth.ts]
[分析依赖]
[生成新文件 auth-service.ts]
[更新 auth.ts 引用]
"重构完成"
```

#### 场景 2: Bug 修复
```bash
$ claude-code "修复测试失败的问题"
[读取测试输出]
[定位失败的测试文件]
[分析代码逻辑]
[修复 bug]
[重新运行测试]
"测试已通过"
```

#### 场景 3: 代码解释
```bash
$ claude-code "解释 session-manager.ts 的工作原理"
[读取 session-manager.ts]
[分析代码结构]
[生成文档]
"这个模块负责..."
```

---

## 8. 技术实现对比

### 8.1 会话存储

| 维度 | Moltbot | Claude Code |
|------|---------|-------------|
| **格式** | JSONL (每行一个 turn) | 内存对象 |
| **位置** | `~/.clawdbot/agents/<agentId>/sessions/` | 不持久化 |
| **大小** | 无限制（自动压缩） | 受上下文窗口限制 |
| **查询** | 可用 `sessions_history` 工具 | 当前会话可见 |
| **备份** | 需手动备份 JSONL 文件 | 不需要 |

### 8.2 认证管理

#### Moltbot
```json5
{
  "auth": {
    "profiles": {
      "anthropic-main": {
        "provider": "anthropic",
        "mode": "api_key",
        "email": "user@example.com"
      },
      "anthropic-backup": {
        "provider": "anthropic",
        "mode": "oauth"
      }
    },
    "order": {
      "anthropic": ["anthropic-main", "anthropic-backup"]
    }
  }
}
```

**特性**:
- 支持多个认证配置
- 自动轮换（失败时切换）
- OAuth 登录存储在 `~/.clawdbot/credentials/`

#### Claude Code
```bash
# 使用环境变量
export ANTHROPIC_API_KEY="sk-ant-..."

# 或使用 API 直接认证
```

**特性**:
- 简单环境变量
- 无轮换机制
- 不支持 OAuth

### 8.3 模型配置

#### Moltbot
```json5
{
  "agent": {
    "model": "anthropic/claude-sonnet-4-5"
  },
  "models": {
    "aliases": {
      "sonnet": "anthropic/claude-sonnet-4-5",
      "opus": "anthropic/claude-opus-4-5"
    }
  }
}
```

**特性**:
- 支持别名（用户可输入 `/new sonnet`）
- 可为不同会话类型配置不同模型
- 支持运行时切换（`/new <model>` 命令）

#### Claude Code
```bash
# 通过命令行参数指定
$ claude-code --model claude-opus-4-5 "任务描述"
```

**特性**:
- 每次运行指定
- 无别名支持
- 不支持运行时切换

---

## 9. 核心差异总结

### 9.1 最大的区别是什么？

**答**: Moltbot 是一个**多渠道、长期运行的个人助手平台**，而 Claude Code 是一个**单任务、按需运行的开发工具**。

**具体体现**:
1. **运行模式**: Moltbot 是守护进程（24/7 运行），Claude Code 是命令行工具（按需启动）
2. **会话模型**: Moltbot 支持数十个并发会话，Claude Code 每次只处理一个任务
3. **记忆范围**: Moltbot 有跨渠道的长期记忆，Claude Code 无长期记忆
4. **工具集**: Moltbot 偏向生活助手功能，Claude Code 专注开发工具

### 9.2 Moltbot 维护多个会话吗？

**答**: **是的**，Moltbot 同时维护多个独立会话。

**示例**:
```
用户的 Moltbot 实例可能同时有:
1. agent:main:main              (个人 DM 主会话)
2. agent:main:telegram:group:123 (Telegram 开发群)
3. agent:main:whatsapp:group:456 (WhatsApp 家庭群)
4. agent:main:slack:dm:789       (Slack 同事 DM)
5. cron:daily-summary            (定时任务会话)
```

每个会话:
- 有独立的消息历史（存储在独立的 JSONL 文件）
- 有独立的 token 计数
- 可以有不同的模型配置
- 可以有不同的工具权限

但它们**共享**:
- Bootstrap 文件（AGENTS.md、SOUL.md 等）
- 技能（Skills）
- 认证配置

### 9.3 建立一个 Slack Bot，和它一直对话，是一个会话吗？

**答**: **是的**，如果你通过 Slack DM 和 Moltbot 对话，这会被映射到一个会话。

**具体情况**:
1. **如果 `session.dmScope = "main"`（默认）**:
   - 你通过 Slack DM 发送的所有消息 → `agent:main:main` 会话
   - 你通过 WhatsApp DM 发送的消息 → 也映射到 `agent:main:main`
   - **结果**: 两个渠道共享一个会话，Moltbot 记得跨渠道的对话

2. **如果 `session.dmScope = "per-channel-peer"`**:
   - Slack DM → `agent:main:slack:dm:<your-slack-id>`
   - WhatsApp DM → `agent:main:whatsapp:dm:<your-phone>`
   - **结果**: 两个独立会话，不共享历史

**Slack 群组的情况**:
```
用户在 Slack 群组 #dev-team 对话 → agent:main:slack:group:<group-id>
用户在 Slack 群组 #marketing 对话 → agent:main:slack:group:<other-group-id>

结果: 两个独立的群组会话
```

### 9.4 Moltbot 的上下文有什么特殊的地方？

**答**: Moltbot 的上下文有 **3 个特殊之处**:

#### 1. **跨渠道共享的长期记忆**

```
用户在 WhatsApp: "我喜欢喝咖啡"
Moltbot: [写入 AGENTS.md]

[2 天后]
用户在 Telegram: "推荐一家咖啡店"
Moltbot: [读取 AGENTS.md，知道用户喜欢咖啡]
         "你喜欢咖啡，推荐..."
```

**对比 Claude Code**: 没有这种跨会话记忆，每次运行都是新的上下文。

#### 2. **分层的持久化上下文**

```
┌─────────────────────────────────────────────┐
│ Layer 1: Bootstrap 文件 (持久化)             │
│   AGENTS.md, SOUL.md, TOOLS.md              │
│   - 手动编辑                                 │
│   - Agent 可更新                             │
│   - 跨所有会话共享                           │
├─────────────────────────────────────────────┤
│ Layer 2: 会话历史 (持久化)                   │
│   <SessionId>.jsonl                         │
│   - 自动记录                                 │
│   - 按会话隔离                               │
│   - 可自动压缩                               │
├─────────────────────────────────────────────┤
│ Layer 3: 技能上下文 (持久化)                 │
│   skills/<skill>/SKILL.md                   │
│   - 动态加载                                 │
│   - 按需注入                                 │
└─────────────────────────────────────────────┘
```

**对比 Claude Code**: 只有 Layer 1（CLAUDE.md）和 Layer 2（当前会话），且 Layer 2 不持久化。

#### 3. **Pre-Compaction Memory Flush 机制**

```
场景: 用户和 Moltbot 聊了 100 轮对话

常规 AI:
[上下文满]
→ 直接报错 "上下文溢出"

Moltbot:
[上下文 85% 满]
→ 触发 Memory Flush
→ Agent 自动整理重要信息
→ 写入 AGENTS.md
→ 清理旧消息
→ 继续对话（用户无感知）
```

**实现**:
```typescript
if (contextUsage > 0.85) {
  // 插入系统消息
  systemPrompt = "请将重要信息写入 AGENTS.md 以便长期保存";

  // Agent 执行 write_file
  agent.call("write_file", {
    path: "AGENTS.md",
    content: updatedMemory
  });

  // 清理旧消息
  pruneOldMessages();
}
```

**对比 Claude Code**: 使用简单的自动总结，但不会写入持久化文件。

---

## 10. 使用建议

### 10.1 何时使用 Moltbot？

✅ **适合场景**:
- 需要跨多个消息平台管理对话
- 需要长期记忆（记住用户偏好、历史对话）
- 需要设备控制（摄像头、通知、文件）
- 需要定时任务和自动化
- 个人助手类应用

❌ **不适合场景**:
- 纯开发任务（写代码、重构、调试）
- 临时性任务（不需要记忆）
- 团队协作（Moltbot 是单用户设计）

### 10.2 何时使用 Claude Code？

✅ **适合场景**:
- 开发任务（写代码、重构、测试）
- 代码库分析和理解
- 快速一次性任务
- 命令行工作流

❌ **不适合场景**:
- 需要跨会话记忆
- 需要多渠道集成
- 需要长期运行的服务
- 非开发任务

### 10.3 能否结合使用？

**可以！** 两者可以互补：

```
开发场景:
- 使用 Claude Code 进行日常开发
- 代码提交后，让 Moltbot 通知 Slack 团队

生活场景:
- 使用 Moltbot 作为日常助手
- 当需要代码帮助时，切换到 Claude Code
```

---

## 11. 架构启示

### 11.1 从 Moltbot 学到什么？

1. **多会话并发设计**: 如果你的应用需要处理多个独立对话，参考 Moltbot 的 `sessionKey` 设计
2. **持久化上下文**: 通过 JSONL 和 Workspace 文件实现长期记忆
3. **智能上下文管理**: Pre-Compaction Memory Flush 是一个优秀的解决方案
4. **渠道抽象**: 统一的消息路由和适配器模式

### 11.2 从 Claude Code 学到什么？

1. **简洁架构**: 不需要复杂的守护进程，直接 CLI 工具即可
2. **项目上下文加载**: 自动理解代码库结构
3. **开发工具集成**: 专注于开发场景的工具设计
4. **临时性会话**: 适合一次性任务的轻量设计

---

## 12. 总结

Moltbot 和 Claude Code 是两个完全不同的产品：

**Moltbot**:
- 🏠 个人助手平台
- 🔗 多渠道集成
- 💾 长期记忆
- 🔄 多会话并发
- 🛠️ 生活工具集

**Claude Code**:
- 💻 开发工具 CLI
- 🎯 单任务聚焦
- ⚡ 临时性会话
- 📁 项目绑定
- 🔧 开发工具集

**关键洞察**: Moltbot 的核心价值在于**跨渠道的长期记忆和多会话管理**，这是 Claude Code 不需要也不提供的功能。

如果你正在设计类似系统，需要先明确：
- 是否需要多渠道集成？
- 是否需要长期记忆？
- 是否需要并发处理多个对话？

如果答案是"是"，参考 Moltbot 的架构；如果只需要单任务工具，Claude Code 的简洁设计更合适。

---

**文档结束** 📋