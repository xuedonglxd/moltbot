# 04 - Gateway基础架构需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 01-配置系统需求, 02-CLI命令框架需求, 03-依赖注入系统需求
> **后续文档**: 05-WebSocket协议需求, 06-插件系统需求

---

## 1. 需求概述

### 1.1 目标描述

实现一个**单一、长期运行**的 Gateway 服务器，作为整个 AI 助手系统的控制平面。Gateway 负责管理所有消息渠道、Agent 运行、设备节点、插件等核心功能，通过 WebSocket 协议对外提供统一的 API 接口。

**核心目标:**
- **控制平面**: Gateway 是系统的唯一控制中心，所有服务通过 Gateway 协调
- **WebSocket API**: 提供基于 WebSocket 的 RPC 风格 API，支持请求/响应和事件推送
- **长期运行**: 设计为守护进程（daemon），24/7 运行
- **热重载**: 支持配置热重载，无需重启即可应用部分配置变更
- **高可用**: 错误隔离、自动恢复、健康检查

### 1.2 业务场景

#### 场景 1: 系统启动
**用户操作**: 用户通过 macOS 菜单栏 App 或 CLI 启动 Gateway。

**系统行为**:
1. 加载配置文件
2. 检查并迁移旧配置
3. 加载插件
4. 启动所有渠道（WhatsApp、Telegram等）
5. 启动 HTTP/WebSocket 服务器（默认 18789 端口）
6. 启动 Canvas Host（可选）
7. 启动 Cron 服务
8. 开始接收客户端连接

#### 场景 2: 客户端连接
**用户操作**: macOS App、iOS App 或 Web UI 连接到 Gateway。

**连接流程**:
```
客户端 WebSocket 连接 → 认证（Token/Password）→ 建立连接
→ 注册客户端类型（Control/Node）→ 开始通信
```

#### 场景 3: Agent 运行请求
**用户操作**: 用户通过消息渠道或 Web UI 发送消息给 Agent。

**处理流程**:
```
消息到达 Gateway → 路由到 Agent → 启动 Agent 运行
→ 流式推送运行状态 → 发送回复到渠道
```

#### 场景 4: 配置热重载
**用户操作**: 用户修改配置文件。

**系统行为**:
1. 监听配置文件变化
2. 重新加载配置
3. 验证新配置
4. 应用部分变更（如渠道配置、Agent 配置）
5. 推送 `config_reloaded` 事件给所有客户端

#### 场景 5: 优雅关闭
**用户操作**: 用户停止 Gateway。

**系统行为**:
1. 拒绝新连接和请求
2. 完成正在处理的请求
3. 通知所有客户端即将关闭
4. 停止所有渠道
5. 停止 Cron 任务
6. 关闭 WebSocket 服务器
7. 清理资源
8. 退出进程

### 1.3 用户价值

- **集中管理**: 所有功能通过 Gateway 统一管理，降低复杂度
- **跨平台访问**: 多个客户端（macOS、iOS、Android、Web）连接到同一个 Gateway
- **实时同步**: 所有客户端通过 WebSocket 实时同步状态
- **高可用性**: 错误隔离，单个渠道或 Agent 出错不影响整体

---

## 2. 核心概念

### 2.1 Gateway 服务器

**定义**: Gateway 是一个长期运行的 Node.js 进程，监听 WebSocket 连接，提供 RPC 风格的 API。

**架构模型**:
```
┌─────────────────────────────────────────────┐
│          Gateway 进程                        │
│  ┌─────────────────────────────────────┐   │
│  │  WebSocket 服务器 (ws://0.0.0.0:18789) │   │
│  └──────────┬──────────────────────────┘   │
│             │                              │
│     ┌───────┴───────┐                      │
│     │               │                      │
│  ┌──▼────┐     ┌───▼──────┐               │
│  │ 客户端 │     │  客户端   │               │
│  │Control│     │  Node    │               │
│  └───────┘     └──────────┘               │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Channel Manager (渠道管理器)         │ │
│  │  - WhatsApp                          │ │
│  │  - Telegram                          │ │
│  │  - Discord                           │ │
│  │  - ...                               │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Plugin Registry (插件注册表)         │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Cron Service (定时任务服务)          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │  Node Registry (设备节点注册表)        │ │
│  └──────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 2.2 客户端类型

#### 类型 1: Control 客户端
**定义**: 控制客户端，用于控制和管理 Gateway。

**示例**:
- macOS 菜单栏 App
- Web 控制台
- CLI 命令（通过 WebSocket 连接）

**能力**:
- 查询系统状态
- 管理配置
- 管理 Agent
- 管理渠道
- 查看日志

#### 类型 2: Node 客户端
**定义**: 设备节点客户端，提供设备能力（相机、屏幕录制等）。

**示例**:
- iOS App
- Android App
- macOS 设备节点

**能力**:
- 注册设备能力
- 响应能力调用请求
- 推送设备事件

### 2.3 WebSocket 协议

**格式**: JSON-RPC 风格的请求/响应 + 事件推送。

**请求格式**:
```json
{
  "id": "req-123",
  "method": "agent.run",
  "params": {
    "agentId": "main",
    "message": "Hello"
  }
}
```

**响应格式**:
```json
{
  "id": "req-123",
  "result": {
    "sessionId": "sess-456",
    "reply": "Hello! How can I help you?"
  }
}
```

**事件格式（服务器推送）**:
```json
{
  "event": "agent.thinking",
  "data": {
    "sessionId": "sess-456",
    "text": "Thinking..."
  }
}
```

### 2.4 Gateway 生命周期

**阶段**:
```
1. 启动初始化
   - 加载配置
   - 检查配置有效性
   - 迁移旧配置（如有）

2. 插件加载
   - 发现插件
   - 加载插件模块
   - 注册插件功能

3. 渠道启动
   - 启动 WhatsApp
   - 启动 Telegram
   - 启动其他渠道

4. 服务启动
   - 启动 WebSocket 服务器
   - 启动 HTTP 服务器
   - 启动 Canvas Host
   - 启动 Cron 服务
   - 启动配置热重载监听

5. 运行状态
   - 接收客户端连接
   - 处理请求
   - 推送事件

6. 配置重载
   - 监听配置变化
   - 重新加载配置
   - 应用部分变更

7. 优雅关闭
   - 停止接收新连接
   - 完成正在处理的请求
   - 停止所有服务
   - 清理资源
   - 退出
```

### 2.5 配置热重载

**模式**:
- `off`: 禁用热重载
- `restart`: 配置变化时重启 Gateway
- `hot`: 应用部分配置变更，无需重启
- `hybrid`: 优先尝试 hot，失败则 restart

**可热重载的配置**:
- Agent 配置（新增、修改、删除）
- 渠道配置（新增、修改）
- 模型配置
- 工具配置
- 认证配置

**需要重启的配置**:
- Gateway 端口
- Gateway 绑定地址
- TLS 配置

### 2.6 健康检查

**健康状态**:
```typescript
interface HealthSnapshot {
  version: string;              // Gateway 版本
  uptime: number;               // 运行时间（秒）
  channels: ChannelHealth[];    // 渠道健康状态
  agents: AgentHealth[];        // Agent 健康状态
  plugins: PluginHealth[];      // 插件健康状态
  nodes: NodeHealth[];          // 设备节点健康状态
}
```

**健康检查频率**:
- 快速检查: 30 秒一次
- 深度检查: 5 分钟一次（探测渠道连接状态）

---

## 3. 功能需求

### 3.1 核心功能列表

#### P0 功能(必须实现)

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F01** | WebSocket 服务器 | 监听 WebSocket 连接 |
| **F02** | HTTP 服务器 | 提供 HTTP API 和静态文件服务 |
| **F03** | 客户端认证 | Token/Password 认证 |
| **F04** | 请求路由 | 根据 method 路由请求到处理器 |
| **F05** | 配置加载 | 启动时加载配置 |
| **F06** | 渠道管理 | 启动/停止渠道 |
| **F07** | 优雅关闭 | 停止时清理资源 |

#### P1 功能(重要)

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F08** | 插件加载 | 动态加载插件 |
| **F09** | 配置热重载 | 监听配置变化并重载 |
| **F10** | Cron 服务 | 定时任务调度 |
| **F11** | 节点注册 | 管理设备节点 |
| **F12** | 健康检查 | 定期检查系统健康状态 |
| **F13** | Canvas Host | 嵌入式 Canvas 服务器 |

#### P2 功能(可选)

| 功能 ID | 功能名称 | 说明 |
|---------|---------|------|
| **F14** | TLS 支持 | HTTPS/WSS 加密连接 |
| **F15** | Tailscale 暴露 | 通过 Tailscale 暴露到公网 |
| **F16** | Discovery 服务 | mDNS/广域网服务发现 |

---

## 4. 非功能需求

### 4.1 性能要求

| 指标 | 要求 | 说明 |
|------|------|------|
| **启动时间** | < 5 秒 | 从启动到接受连接 |
| **请求延迟** | < 50ms | 处理简单请求的延迟 |
| **并发连接** | ≥ 100 | 支持的并发 WebSocket 连接数 |
| **内存占用** | < 500MB | 正常运行时的内存占用 |

### 4.2 可靠性要求

| 要求 | 说明 |
|------|------|
| **错误隔离** | 单个渠道或 Agent 出错不影响其他服务 |
| **自动恢复** | 渠道断线时自动重连 |
| **优雅降级** | 关键服务出错时，非关键服务继续运行 |
| **状态持久化** | 配置和会话状态持久化到磁盘 |

### 4.3 安全性要求

| 要求 | 说明 |
|------|------|
| **认证** | 所有 WebSocket 连接必须认证 |
| **授权** | 不同客户端类型有不同的权限 |
| **加密** | 支持 TLS 加密（可选）|
| **访问控制** | 控制 Gateway 绑定地址（loopback/LAN/Tailscale）|

---

## 5. 架构设计

### 5.1 技术选型

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| **ws** | 8.x | WebSocket 服务器 | 轻量级、高性能、社区活跃 |
| **Hono** | Latest | HTTP 服务器 | 现代化、类型安全、性能好 |
| **Node.js http/https** | 内置 | HTTP(S) 服务器 | 原生支持、无依赖 |
| **Chokidar** | 3.x | 文件监听 | 跨平台、稳定 |

### 5.2 模块结构

```
src/gateway/
├── server.impl.ts              # Gateway 主入口
├── server-http.ts              # HTTP 服务器
├── server-ws-runtime.ts        # WebSocket 运行时
├── server-channels.ts          # 渠道管理器
├── server-plugins.ts           # 插件加载器
├── server-cron.ts              # Cron 服务
├── server-close.ts             # 关闭处理器
├── config-reload.ts            # 配置热重载
├── server-methods.ts           # 请求处理器注册
├── server-methods/             # 各种请求处理器
│   ├── agent.ts
│   ├── agents.ts
│   ├── channels.ts
│   ├── config.ts
│   └── ...
├── node-registry.ts            # 设备节点注册表
├── auth.ts                     # 认证逻辑
└── server/
    ├── health-state.ts         # 健康状态管理
    └── tls.ts                  # TLS 配置
```

### 5.3 接口定义

#### 接口 1: GatewayServer

```typescript
export interface GatewayServer {
  /** 关闭 Gateway 服务器 */
  close: (opts?: {
    reason?: string;               // 关闭原因
    restartExpectedMs?: number | null; // 预期重启时间
  }) => Promise<void>;
}
```

#### 接口 2: GatewayServerOptions

```typescript
export interface GatewayServerOptions {
  /** 绑定地址策略 (loopback|lan|tailnet|auto) */
  bind?: 'loopback' | 'lan' | 'tailnet' | 'auto';

  /** 高级：直接指定绑定 host */
  host?: string;

  /** 是否启用 Control UI */
  controlUiEnabled?: boolean;

  /** 是否启用 OpenAI Chat Completions API */
  openAiChatCompletionsEnabled?: boolean;

  /** 认证配置覆盖 */
  auth?: GatewayAuthConfig;

  /** Tailscale 配置覆盖 */
  tailscale?: GatewayTailscaleConfig;
}
```

#### 接口 3: ChannelManager

```typescript
export interface ChannelManager {
  /** 启动所有渠道 */
  startAll(): Promise<void>;

  /** 启动单个渠道 */
  start(channelId: string): Promise<void>;

  /** 停止单个渠道 */
  stop(channelId: string): Promise<void>;

  /** 停止所有渠道 */
  stopAll(): Promise<void>;

  /** 获取渠道状态 */
  getStatus(channelId: string): ChannelStatus;
}
```

### 5.4 数据流图

```
┌──────────────────────────────────────────────────────────┐
│              Gateway 启动流程                             │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  1. 加载配置                                              │
│     - readConfigFileSnapshot()                          │
│     - 检查配置有效性                                      │
│     - 迁移旧配置（如有）                                  │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  2. 加载插件                                              │
│     - loadGatewayPlugins()                              │
│     - 注册插件提供的渠道、工具、提供商                      │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  3. 启动渠道                                              │
│     - createChannelManager()                            │
│     - channelManager.startAll()                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  4. 启动 HTTP/WebSocket 服务器                            │
│     - 创建 HTTP(S) 服务器                                 │
│     - 附加 WebSocket 处理器                               │
│     - 监听端口 18789                                      │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  5. 启动其他服务                                          │
│     - Canvas Host (可选)                                │
│     - Cron Service                                      │
│     - Config Reload Watcher                             │
│     - Health Check Timer                                │
│     - Tailscale Exposure (可选)                         │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│  6. 进入运行状态                                          │
│     - 接受客户端连接                                      │
│     - 处理请求                                            │
│     - 推送事件                                            │
└──────────────────────────────────────────────────────────┘
```

---

## 6. 关键实现

### 6.1 实现步骤

#### 步骤 1: 实现 Gateway 主入口(server.impl.ts)

**目标**: 实现 `startGatewayServer()` 函数。

**伪代码**:
```typescript
export async function startGatewayServer(
  port = 18789,
  opts: GatewayServerOptions = {}
): Promise<GatewayServer> {
  // 1. 加载配置
  let configSnapshot = await readConfigFileSnapshot();

  // 2. 检查并迁移旧配置
  if (configSnapshot.legacyIssues.length > 0) {
    const { config: migrated } = migrateLegacyConfig(configSnapshot.parsed);
    await writeConfigFile(migrated);
    configSnapshot = await readConfigFileSnapshot();
  }

  // 3. 验证配置
  if (!configSnapshot.valid) {
    throw new Error(`Invalid config: ${configSnapshot.issues}`);
  }

  const cfg = configSnapshot.config;

  // 4. 加载插件
  const plugins = await loadGatewayPlugins(cfg);

  // 5. 创建渠道管理器
  const channelManager = createChannelManager(cfg, plugins);

  // 6. 启动所有渠道
  await channelManager.startAll();

  // 7. 创建 HTTP 服务器
  const server = createHttpServer(cfg, opts);

  // 8. 附加 WebSocket 处理器
  attachGatewayWsHandlers(server, cfg, channelManager);

  // 9. 监听端口
  await new Promise<void>((resolve) => {
    server.listen(port, opts.host ?? '127.0.0.1', () => {
      log.info(`Gateway listening on ${opts.host ?? '127.0.0.1'}:${port}`);
      resolve();
    });
  });

  // 10. 启动 Canvas Host（可选）
  if (cfg.canvasHost?.enabled) {
    await startCanvasHost(cfg);
  }

  // 11. 启动 Cron 服务
  const cronService = buildGatewayCronService(cfg);
  await cronService.start();

  // 12. 启动配置热重载
  const reloadWatcher = startGatewayConfigReloader(cfg, {
    onReload: async (newCfg) => {
      await channelManager.reload(newCfg);
    }
  });

  // 13. 返回 Gateway 对象
  return {
    close: async (opts) => {
      await closeGateway(server, channelManager, cronService, reloadWatcher, opts);
    }
  };
}
```

#### 步骤 2: 实现渠道管理器(server-channels.ts)

**目标**: 管理所有渠道的启动和停止。

**伪代码**:
```typescript
export function createChannelManager(
  cfg: MoltbotConfig,
  plugins: PluginServicesHandle
): ChannelManager {
  const channels = new Map<string, Channel>();

  async function startAll() {
    // 启动 WhatsApp
    if (cfg.channels?.whatsapp?.enabled) {
      const whatsapp = await startWhatsAppChannel(cfg);
      channels.set('whatsapp', whatsapp);
    }

    // 启动 Telegram
    if (cfg.channels?.telegram?.enabled) {
      const telegram = await startTelegramChannel(cfg);
      channels.set('telegram', telegram);
    }

    // 启动其他渠道...
    // 启动插件提供的渠道...
  }

  async function stop(channelId: string) {
    const channel = channels.get(channelId);
    if (channel) {
      await channel.stop();
      channels.delete(channelId);
    }
  }

  async function stopAll() {
    for (const [id, channel] of channels) {
      await channel.stop();
    }
    channels.clear();
  }

  return { startAll, start, stop, stopAll, getStatus };
}
```

#### 步骤 3: 实现 WebSocket 处理器(server-ws-runtime.ts)

**目标**: 处理 WebSocket 连接和消息。

**伪代码**:
```typescript
export function attachGatewayWsHandlers(
  server: Server,
  cfg: MoltbotConfig,
  channelManager: ChannelManager
) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    // 1. 认证
    const authResult = await authenticateWebSocket(req, cfg);
    if (!authResult.ok) {
      ws.close(1008, 'Authentication failed');
      return;
    }

    // 2. 注册客户端
    const clientId = generateClientId();
    clients.set(clientId, { ws, type: authResult.clientType });

    // 3. 处理消息
    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // 请求消息
        if (msg.id && msg.method) {
          const handler = findHandler(msg.method);
          const result = await handler(msg.params, { cfg, channelManager });

          // 发送响应
          ws.send(JSON.stringify({
            id: msg.id,
            result
          }));
        }
      } catch (err) {
        // 发送错误响应
        ws.send(JSON.stringify({
          id: msg.id,
          error: { code: -32000, message: String(err) }
        }));
      }
    });

    // 4. 处理断开
    ws.on('close', () => {
      clients.delete(clientId);
    });
  });
}
```

#### 步骤 4: 实现配置热重载(config-reload.ts)

**目标**: 监听配置文件变化并重新加载。

**伪代码**:
```typescript
export function startGatewayConfigReloader(
  cfg: MoltbotConfig,
  callbacks: { onReload: (cfg: MoltbotConfig) => Promise<void> }
) {
  const watcher = chokidar.watch(CONFIG_PATH, {
    ignoreInitial: true,
  });

  watcher.on('change', async () => {
    log.info('Config file changed, reloading...');

    // 1. 重新加载配置
    const newSnapshot = await readConfigFileSnapshot();

    // 2. 验证配置
    if (!newSnapshot.valid) {
      log.error('New config is invalid, skipping reload');
      return;
    }

    // 3. 应用配置
    try {
      await callbacks.onReload(newSnapshot.config);
      log.info('Config reloaded successfully');

      // 4. 推送事件给所有客户端
      broadcastEvent('config_reloaded', { config: newSnapshot.config });
    } catch (err) {
      log.error('Failed to apply new config:', err);
    }
  });

  return {
    stop: () => watcher.close()
  };
}
```

#### 步骤 5: 实现优雅关闭(server-close.ts)

**目标**: 优雅地关闭 Gateway，清理所有资源。

**伪代码**:
```typescript
export async function closeGateway(
  server: Server,
  channelManager: ChannelManager,
  cronService: CronService,
  reloadWatcher: { stop: () => void },
  opts?: { reason?: string; restartExpectedMs?: number | null }
) {
  log.info('Closing Gateway', opts);

  // 1. 通知所有客户端
  broadcastEvent('gateway_closing', {
    reason: opts?.reason,
    restartExpectedMs: opts?.restartExpectedMs
  });

  // 2. 停止接受新连接
  server.close();

  // 3. 等待正在处理的请求完成（最多 30 秒）
  await waitForActiveRequests(30000);

  // 4. 停止配置热重载
  reloadWatcher.stop();

  // 5. 停止 Cron 服务
  await cronService.stop();

  // 6. 停止所有渠道
  await channelManager.stopAll();

  // 7. 关闭所有客户端连接
  for (const [id, client] of clients) {
    client.ws.close(1001, 'Gateway shutting down');
  }

  log.info('Gateway closed');
}
```

### 6.2 技术难点

#### 难点 1: WebSocket 连接的并发处理

**问题**: 如何高效处理大量并发的 WebSocket 连接和消息？

**解决方案**:
- 使用异步处理，避免阻塞事件循环
- 对每个客户端独立处理，避免相互影响
- 限制单个客户端的请求速率

#### 难点 2: 配置热重载的原子性

**问题**: 配置重载失败时如何回滚？

**解决方案**:
- 先验证新配置，失败则不应用
- 部分配置支持热重载，需要重启的配置给出提示
- 保留旧配置备份，失败时回滚

#### 难点 3: 优雅关闭的超时处理

**问题**: 如果某些请求无法在超时时间内完成怎么办？

**解决方案**:
- 设置合理的超时时间（30 秒）
- 超时后强制关闭连接
- 记录未完成的请求，便于排查问题

### 6.3 参考代码位置

| 功能 | Moltbot 代码位置 |
|------|-----------------|
| Gateway 主入口 | `src/gateway/server.impl.ts:147-200` |
| 渠道管理器 | `src/gateway/server-channels.ts` |
| WebSocket 处理器 | `src/gateway/server-ws-runtime.ts` |
| 配置热重载 | `src/gateway/config-reload.ts` |
| 优雅关闭 | `src/gateway/server-close.ts` |

---

## 7. 验收标准

### 7.1 功能验收

#### 验收项 1: Gateway 启动

**测试步骤**:
1. 执行 `moltbot gateway run`
2. 验证 Gateway 启动成功
3. 验证监听端口 18789

**通过标准**:
- Gateway 成功启动
- 端口正常监听
- 所有渠道启动成功

#### 验收项 2: WebSocket 连接

**测试步骤**:
1. 创建 WebSocket 客户端
2. 连接到 Gateway
3. 发送认证请求
4. 发送测试请求

**通过标准**:
- 连接成功建立
- 认证通过
- 请求得到正确响应

#### 验收项 3: 配置热重载

**测试步骤**:
1. Gateway 运行中
2. 修改配置文件
3. 验证配置重新加载
4. 验证新配置生效

**通过标准**:
- 配置变化被检测
- 新配置成功加载
- 配置生效无需重启

#### 验收项 4: 优雅关闭

**测试步骤**:
1. Gateway 运行中
2. 发送关闭信号
3. 验证所有资源被清理

**通过标准**:
- 所有渠道停止
- 所有客户端断开
- 进程正常退出

---

**文档完成** ✅

下一步: 实现 Gateway 基础架构代码，并编写单元测试。
