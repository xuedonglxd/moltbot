# 14 - Agent基础架构需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 12-会话管理需求
> **后续文档**: 15-LLM提供商集成需求, 16-Agent执行循环需求

---

## 1. 需求概述

### 1.1 目标描述

实现**嵌入式 Agent 运行引擎**，基于 pi-agent-core 库提供完整的 Agent 运行能力，包括工作空间管理、指令系统、人格配置、会话隔离等。

**核心目标:**
- **工作空间隔离**: 每个 Agent 有独立的工作目录和配置
- **指令系统**: 支持加载 AGENTS.md、SOUL.md 等指令文件
- **会话隔离**: 不同会话的上下文完全隔离
- **工具系统**: 集成丰富的工具集

---

## 2. 核心概念

### 2.1 Agent 工作空间

**位置**: `~/.clawdbot/agents/<agentId>/`

**结构**:
```
~/.clawdbot/agents/main/
├── AGENTS.md          # Agent 指令
├── SOUL.md            # 人格设定
├── TOOLS.md           # 工具说明
├── IDENTITY.md        # 身份信息
├── USER.md            # 用户信息
├── sessions/          # 会话目录
│   ├── sessions.json  # 会话元数据
│   ├── <sessionId>.jsonl  # 会话历史
│   └── ...
└── workspace/         # 工作目录（Agent 可读写）
```

### 2.2 指令文件

#### AGENTS.md
**用途**: Agent 的核心指令和行为定义。

**示例**:
```markdown
# Agent Instructions

You are a helpful AI assistant. Follow these rules:
- Be concise and clear
- Ask clarifying questions when needed
- Use tools when appropriate
```

#### SOUL.md
**用途**: Agent 的人格和语气。

**示例**:
```markdown
# Personality

You are friendly, professional, and patient.
```

### 2.3 Agent 配置

```json5
{
  agents: {
    list: [
      {
        id: "main",
        name: "主助手",
        default: true,
        provider: "anthropic",
        model: "sonnet",
        dir: "~/.clawdbot/agents/main",
        maxConcurrent: 5
      }
    ]
  }
}
```

---

## 3. 关键实现

### 3.1 实现步骤

#### 步骤 1: 创建 Agent 工作空间

```typescript
export function ensureAgentWorkspace(agentId: string) {
  const dir = resolveAgentWorkspaceDir(agentId);

  // 创建目录
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(dir, 'sessions'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'workspace'), { recursive: true });

  // 创建默认指令文件（如果不存在）
  const agentsMdPath = path.join(dir, 'AGENTS.md');
  if (!fs.existsSync(agentsMdPath)) {
    fs.writeFileSync(agentsMdPath, DEFAULT_AGENTS_MD);
  }
}
```

#### 步骤 2: 加载指令文件

```typescript
export function loadAgentInstructions(agentId: string) {
  const dir = resolveAgentWorkspaceDir(agentId);

  return {
    agentsMd: readFileIfExists(path.join(dir, 'AGENTS.md')),
    soulMd: readFileIfExists(path.join(dir, 'SOUL.md')),
    toolsMd: readFileIfExists(path.join(dir, 'TOOLS.md')),
    identityMd: readFileIfExists(path.join(dir, 'IDENTITY.md')),
    userMd: readFileIfExists(path.join(dir, 'USER.md')),
  };
}
```

---

**文档完成** ✅
