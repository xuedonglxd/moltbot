# 16 - Agent执行循环需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 14-Agent基础架构需求, 15-LLM提供商集成需求
> **后续文档**: 17-上下文窗口管理需求, 18-工具抽象层需求

---

## 1. 需求概述

### 1.1 目标描述

实现 **Agent 的主执行循环**，负责处理用户消息、调用 LLM、执行工具、流式输出结果的完整流程。

**核心目标:**
- **消息处理**: 接收用户消息，构建 prompt
- **模型调用**: 调用 LLM 生成回复
- **工具调用**: 执行 Agent 请求的工具
- **流式输出**: 实时流式推送 Agent 输出
- **错误恢复**: 处理模型错误和工具错误

---

## 2. 核心概念

### 2.1 执行循环

```
接收用户消息
  ↓
加载会话历史
  ↓
构建 Prompt（系统提示 + 历史 + 新消息）
  ↓
调用 LLM
  ↓
流式输出 Assistant 回复
  ↓
检测工具调用
  ├─ 有 → 执行工具 → 将结果添加到上下文 → 继续调用 LLM
  └─ 无 → 结束
  ↓
保存历史
  ↓
返回最终回复
```

### 2.2 生命周期事件

| 事件 | 说明 |
|------|------|
| `lifecycle:start` | Agent 开始运行 |
| `assistant:delta` | Assistant 回复增量 |
| `tool:call` | 工具调用 |
| `tool:result` | 工具结果 |
| `lifecycle:end` | Agent 运行结束 |
| `lifecycle:error` | 运行出错 |

---

## 3. 关键实现

### 3.1 实现步骤

```typescript
export async function runEmbeddedPiAgent(params: {
  sessionId: string;
  sessionKey: string;
  agentId: string;
  prompt: string;
  onEvent: (event: AgentEvent) => void;
}) {
  // 1. 加载历史
  const history = await loadTranscript(params.sessionId);

  // 2. 加载指令
  const instructions = loadAgentInstructions(params.agentId);

  // 3. 构建系统提示
  const systemPrompt = buildSystemPrompt(instructions);

  // 4. 调用 LLM
  const stream = await callLLM({
    model: 'anthropic/claude-sonnet-4-5',
    messages: [...history, { role: 'user', content: params.prompt }],
    system: systemPrompt,
    tools: loadTools(),
  });

  // 5. 处理流式输出
  for await (const chunk of stream) {
    if (chunk.type === 'content_delta') {
      params.onEvent({
        type: 'assistant:delta',
        delta: chunk.text
      });
    } else if (chunk.type === 'tool_use') {
      // 执行工具
      const result = await executeTool(chunk.name, chunk.input);

      params.onEvent({
        type: 'tool:result',
        name: chunk.name,
        result
      });

      // 继续 LLM 调用...
    }
  }

  // 6. 保存历史
  await appendToTranscript(params.sessionId, [...history, newMessages]);
}
```

---

**文档完成** ✅
