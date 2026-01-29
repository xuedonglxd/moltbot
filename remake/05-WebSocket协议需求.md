# 05 - WebSocket协议需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 04-Gateway基础架构需求
> **后续文档**: 06-插件系统需求, 07-渠道抽象层需求

---

## 1. 需求概述

### 1.1 目标描述

定义并实现 Gateway 与客户端之间的 **WebSocket 通信协议**，采用 JSON-RPC 风格的请求/响应模型，支持双向通信、事件推送和流式数据传输。

**核心目标:**
- **请求/响应**: 客户端发送请求，Gateway 返回响应
- **事件推送**: Gateway 主动推送事件给客户端
- **流式传输**: 支持 Agent 运行过程的流式输出
- **版本化**: 协议支持版本控制，便于演进

### 1.2 业务场景

#### 场景 1: 查询 Agent 列表
**客户端请求**:
```json
{
  "id": "req-001",
  "method": "agents.list",
  "params": {}
}
```

**Gateway 响应**:
```json
{
  "id": "req-001",
  "result": {
    "agents": [
      { "id": "main", "name": "主助手", "default": true },
      { "id": "research", "name": "研究助手" }
    ]
  }
}
```

#### 场景 2: 运行 Agent（流式）
**客户端请求**:
```json
{
  "id": "req-002",
  "method": "agent.run",
  "params": {
    "agentId": "main",
    "message": "Hello"
  }
}
```

**Gateway 流式推送**:
```json
// 事件 1: 开始运行
{
  "event": "agent.lifecycle",
  "data": {
    "sessionId": "sess-123",
    "type": "start"
  }
}

// 事件 2: 思考过程
{
  "event": "agent.thinking",
  "data": {
    "sessionId": "sess-123",
    "text": "I'm thinking about your question..."
  }
}

// 事件 3: 助手回复（增量）
{
  "event": "agent.assistant_delta",
  "data": {
    "sessionId": "sess-123",
    "delta": "Hello! "
  }
}

// 事件 4: 结束
{
  "event": "agent.lifecycle",
  "data": {
    "sessionId": "sess-123",
    "type": "end"
  }
}
```

**最终响应**:
```json
{
  "id": "req-002",
  "result": {
    "sessionId": "sess-123",
    "reply": "Hello! How can I help you?"
  }
}
```

#### 场景 3: 订阅配置变更事件
**客户端请求**:
```json
{
  "id": "req-003",
  "method": "events.subscribe",
  "params": {
    "events": ["config_reloaded", "channel_status_changed"]
  }
}
```

**Gateway 响应**:
```json
{
  "id": "req-003",
  "result": { "subscribed": true }
}
```

**Gateway 推送事件**（配置重载时）:
```json
{
  "event": "config_reloaded",
  "data": {
    "timestamp": "2026-01-29T10:30:00Z"
  }
}
```

### 1.3 用户价值

- **实时通信**: WebSocket 双向通信，实时同步状态
- **流式体验**: Agent 回复流式输出，用户体验流畅
- **事件驱动**: 订阅感兴趣的事件，及时响应变化

---

## 2. 核心概念

### 2.1 协议格式

#### 请求消息
```typescript
interface RequestMessage {
  id: string;              // 请求 ID（唯一）
  method: string;          // 方法名（如 "agent.run"）
  params?: object;         // 参数对象
}
```

#### 响应消息
```typescript
interface ResponseMessage {
  id: string;              // 对应的请求 ID
  result?: any;            // 成功结果
  error?: {                // 错误信息
    code: number;
    message: string;
    data?: any;
  };
}
```

#### 事件消息
```typescript
interface EventMessage {
  event: string;           // 事件类型
  data: any;               // 事件数据
}
```

### 2.2 方法分类

#### 系统管理类
- `health.check` - 健康检查
- `gateway.info` - Gateway 信息
- `gateway.reload` - 重载配置

#### Agent 管理类
- `agents.list` - 列出所有 Agent
- `agents.add` - 添加 Agent
- `agents.delete` - 删除 Agent
- `agent.run` - 运行 Agent

#### 渠道管理类
- `channels.list` - 列出所有渠道
- `channels.status` - 查询渠道状态
- `channels.start` - 启动渠道
- `channels.stop` - 停止渠道

#### 配置管理类
- `config.get` - 获取配置
- `config.set` - 设置配置
- `config.apply` - 应用配置补丁

#### 事件订阅类
- `events.subscribe` - 订阅事件
- `events.unsubscribe` - 取消订阅

### 2.3 事件类型

#### Agent 运行事件
- `agent.lifecycle` - 生命周期事件（start/end/error）
- `agent.thinking` - 思考过程
- `agent.assistant_delta` - 助手回复增量
- `agent.tool_call` - 工具调用
- `agent.tool_result` - 工具结果

#### 系统事件
- `config_reloaded` - 配置已重载
- `channel_status_changed` - 渠道状态变化
- `gateway_closing` - Gateway 即将关闭

#### 节点事件
- `node.connected` - 设备节点连接
- `node.disconnected` - 设备节点断开

### 2.4 错误码

| 错误码 | 名称 | 说明 |
|--------|------|------|
| -32700 | Parse error | JSON 解析错误 |
| -32600 | Invalid Request | 无效的请求格式 |
| -32601 | Method not found | 方法不存在 |
| -32602 | Invalid params | 参数无效 |
| -32603 | Internal error | 内部错误 |
| -32000 | Server error | 服务器错误（自定义） |

---

## 3. 功能需求

### 3.1 核心功能列表

#### P0 功能

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F01** | 请求解析 | 解析 JSON 格式的请求消息 |
| **F02** | 方法路由 | 根据 method 路由到处理器 |
| **F03** | 响应发送 | 发送 JSON 格式的响应消息 |
| **F04** | 错误处理 | 标准化错误响应 |
| **F05** | 事件推送 | 推送事件给订阅的客户端 |

#### P1 功能

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F06** | 流式传输 | 支持流式推送多个事件 |
| **F07** | 事件订阅 | 客户端订阅感兴趣的事件 |
| **F08** | 心跳检测 | 定期发送 ping/pong 保持连接 |

---

## 4. 架构设计

### 4.1 接口定义

#### 接口 1: WebSocket 消息

```typescript
// 请求消息
type RequestMessage = {
  id: string;
  method: string;
  params?: Record<string, unknown>;
};

// 响应消息
type ResponseMessage = {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

// 事件消息
type EventMessage = {
  event: string;
  data: unknown;
};

// WebSocket 消息联合类型
type WsMessage = RequestMessage | ResponseMessage | EventMessage;
```

#### 接口 2: 方法处理器

```typescript
type MethodHandler = (
  params: Record<string, unknown>,
  context: {
    clientId: string;
    clientType: 'control' | 'node';
    cfg: MoltbotConfig;
  }
) => Promise<unknown>;
```

### 4.2 数据流图

```
客户端                          Gateway
  │                               │
  ├─ 发送请求 ─────────────────────>│
  │  { id: "1", method: "agent.run" }
  │                               │
  │                               ├─ 解析请求
  │                               ├─ 路由到处理器
  │                               ├─ 执行处理器
  │                               │
  │<─ 推送事件 ─────────────────────┤
  │  { event: "agent.thinking" } │
  │                               │
  │<─ 推送事件 ─────────────────────┤
  │  { event: "agent.assistant_delta" }
  │                               │
  │<─ 返回响应 ─────────────────────┤
  │  { id: "1", result: {...} }  │
```

---

## 5. 关键实现

### 5.1 实现步骤

#### 步骤 1: 定义消息类型

```typescript
// src/gateway/protocol.ts
export type RequestMessage = {
  id: string;
  method: string;
  params?: Record<string, unknown>;
};

export type ResponseMessage = {
  id: string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

export type EventMessage = {
  event: string;
  data: unknown;
};
```

#### 步骤 2: 实现方法注册表

```typescript
// src/gateway/server-methods.ts
const methodHandlers = new Map<string, MethodHandler>();

export function registerMethod(
  method: string,
  handler: MethodHandler
) {
  methodHandlers.set(method, handler);
}

export function findHandler(method: string): MethodHandler | null {
  return methodHandlers.get(method) ?? null;
}

// 注册所有方法
registerMethod('agents.list', agentsListHandler);
registerMethod('agent.run', agentRunHandler);
registerMethod('channels.list', channelsListHandler);
// ...
```

#### 步骤 3: 处理 WebSocket 消息

```typescript
// src/gateway/server-ws-runtime.ts
ws.on('message', async (data) => {
  let msg: RequestMessage;

  try {
    msg = JSON.parse(data.toString());
  } catch (err) {
    // JSON 解析错误
    ws.send(JSON.stringify({
      id: null,
      error: { code: -32700, message: 'Parse error' }
    }));
    return;
  }

  // 验证请求格式
  if (!msg.id || !msg.method) {
    ws.send(JSON.stringify({
      id: msg.id,
      error: { code: -32600, message: 'Invalid Request' }
    }));
    return;
  }

  // 查找处理器
  const handler = findHandler(msg.method);
  if (!handler) {
    ws.send(JSON.stringify({
      id: msg.id,
      error: { code: -32601, message: 'Method not found' }
    }));
    return;
  }

  // 执行处理器
  try {
    const result = await handler(msg.params ?? {}, context);

    ws.send(JSON.stringify({
      id: msg.id,
      result
    }));
  } catch (err) {
    ws.send(JSON.stringify({
      id: msg.id,
      error: {
        code: -32000,
        message: String(err)
      }
    }));
  }
});
```

#### 步骤 4: 实现事件推送

```typescript
// src/gateway/events.ts
const subscribers = new Map<string, Set<WebSocket>>();

export function subscribe(
  clientId: string,
  ws: WebSocket,
  events: string[]
) {
  for (const event of events) {
    if (!subscribers.has(event)) {
      subscribers.set(event, new Set());
    }
    subscribers.get(event)!.add(ws);
  }
}

export function broadcast(event: string, data: unknown) {
  const subs = subscribers.get(event);
  if (!subs) return;

  const message = JSON.stringify({ event, data });
  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
```

### 5.2 参考代码位置

| 功能 | Moltbot 代码位置 |
|------|-----------------|
| 方法列表 | `src/gateway/server-methods-list.ts` |
| 方法处理器 | `src/gateway/server-methods.ts` |
| WebSocket 运行时 | `src/gateway/server-ws-runtime.ts` |

---

## 6. 验收标准

### 6.1 功能验收

#### 验收项 1: 请求/响应

**测试步骤**:
1. 连接 WebSocket
2. 发送 `agents.list` 请求
3. 验证响应格式

**通过标准**:
- 响应包含 `id` 和 `result`
- `result` 包含 Agent 列表

#### 验收项 2: 事件推送

**测试步骤**:
1. 订阅 `config_reloaded` 事件
2. 修改配置文件
3. 验证收到事件

**通过标准**:
- 收到事件消息
- 事件格式正确

---

**文档完成** ✅
