# Moltbot 作为 Claude Code 远程后端的部署方案

## 方案概述

将 Moltbot 部署为 **Claude Code 的远程执行后端**，实现以下能力：

- Claude Code 保持原有 CLI 体验（本地交互）
- 工具执行在远程服务器（通过 Moltbot）
- 支持多用户/多环境隔离
- 跨平台访问（通过 Telegram/Discord 等渠道也可控制同一后端）

---

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Local Machine                        │
│                                                           │
│  ┌──────────────────┐                                   │
│  │  Claude Code CLI │                                   │
│  │  (Frontend)      │                                   │
│  └────────┬─────────┘                                   │
│           │                                              │
│           │ HTTP/WebSocket                               │
└───────────┼──────────────────────────────────────────────┘
            │
            │ (Secure Tunnel: Tailscale/ngrok/CloudFlare)
            │
┌───────────▼──────────────────────────────────────────────┐
│                   Remote Server                          │
│                                                           │
│  ┌──────────────────┐         ┌───────────────────────┐ │
│  │ Moltbot Gateway  │◄────────┤  Telegram Bot         │ │
│  │ (Execution Backend) │       │  Discord Bot          │ │
│  └────────┬─────────┘         │  Slack Bot            │ │
│           │                    └───────────────────────┘ │
│           │                                              │
│  ┌────────▼─────────┐                                   │
│  │ Moltbot Agent    │                                   │
│  │ - exec tool      │                                   │
│  │ - process tool   │                                   │
│  │ - file tools     │                                   │
│  └────────┬─────────┘                                   │
│           │                                              │
│  ┌────────▼─────────────────────────────────────────┐  │
│  │  Execution Environment                           │  │
│  │  - Host (直接执行)                                │  │
│  │  - Docker Sandbox (隔离环境)                     │  │
│  │  - Remote Node (分布式执行)                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 部署步骤

### Step 1: 服务器端部署 Moltbot Gateway

#### 1.1 安装 Moltbot

```bash
# 在远程服务器上
curl -fsSL https://molt.bot/install.sh | sh

# 或通过 npm
npm install -g moltbot@latest
```

#### 1.2 配置 Gateway

创建配置文件：`~/.clawdbot/config.yaml`

```yaml
# Gateway 基础配置
gateway:
  mode: local
  bind: 0.0.0.0       # 监听所有接口（通过 Tailscale 限制访问）
  port: 18789
  auth:
    enabled: true     # 启用认证
    secret: "your-secret-token-here"  # 生成强随机密钥

# 工具权限配置（安全第一）
tools:
  profile: coding     # 仅启用文件 + 运行时工具
  exec:
    security: allowlist  # 白名单模式
    allowlist:
      - "git *"
      - "npm *"
      - "pnpm *"
      - "bun *"
      - "docker *"
      - "kubectl *"
    ask: on-miss      # 非白名单命令需确认

# LLM Provider 配置
providers:
  anthropic:
    apiKey: ${ANTHROPIC_API_KEY}
    model: claude-sonnet-4.5

# 日志配置
log:
  level: info
  file: ~/.clawdbot/logs/gateway.log
```

#### 1.3 启动 Gateway

```bash
# 前台启动（测试）
moltbot gateway run

# 后台启动（生产）
nohup moltbot gateway run > /tmp/moltbot-gateway.log 2>&1 &

# 或使用 systemd
sudo tee /etc/systemd/system/moltbot-gateway.service <<EOF
[Unit]
Description=Moltbot Gateway
After=network.target

[Service]
Type=simple
User=your-user
ExecStart=/usr/local/bin/moltbot gateway run
Restart=always
Environment="ANTHROPIC_API_KEY=your-api-key"

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable moltbot-gateway
sudo systemctl start moltbot-gateway
```

#### 1.4 验证 Gateway

```bash
# 检查端口监听
ss -ltnp | grep 18789

# 查看日志
tail -f ~/.clawdbot/logs/gateway.log

# 测试连接
curl http://localhost:18789/health
```

---

### Step 2: 网络连接配置

#### 方案 A：Tailscale（推荐，安全且简单）

**服务器端**：

```bash
# 安装 Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# 登录并启动
sudo tailscale up

# 获取 Tailscale IP
tailscale ip -4
# 示例输出：100.101.102.103
```

**客户端**：

```bash
# 安装 Tailscale
# macOS: brew install tailscale
# Linux: 同上

# 登录同一账户
sudo tailscale up

# 测试连接
curl http://100.101.102.103:18789/health
```

#### 方案 B：ngrok（公网访问，适合临时使用）

```bash
# 服务器端
ngrok http 18789

# 输出示例：
# Forwarding: https://abc123.ngrok.io -> http://localhost:18789

# 客户端访问：
curl https://abc123.ngrok.io/health
```

#### 方案 C：Cloudflare Tunnel（生产级，HTTPS 自动）

```bash
# 服务器端安装 cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
sudo mv cloudflared /usr/local/bin/

# 登录 Cloudflare
cloudflared tunnel login

# 创建 Tunnel
cloudflared tunnel create moltbot-gateway

# 配置路由
cloudflared tunnel route dns moltbot-gateway moltbot.yourdomain.com

# 启动 Tunnel
cloudflared tunnel run --url http://localhost:18789 moltbot-gateway
```

---

### Step 3: Claude Code 集成

#### 3.1 创建 MCP Server 插件

在本地机器创建：`~/.config/claude-code/mcp-servers/moltbot/`

**文件结构**：

```
~/.config/claude-code/mcp-servers/moltbot/
├── package.json
├── index.ts
└── server.ts
```

**package.json**：

```json
{
  "name": "mcp-moltbot",
  "version": "1.0.0",
  "type": "module",
  "main": "index.ts",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "axios": "^1.6.0"
  }
}
```

**server.ts**（核心逻辑）：

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";

const MOLTBOT_GATEWAY_URL = process.env.MOLTBOT_GATEWAY_URL || "http://100.101.102.103:18789";
const MOLTBOT_AUTH_TOKEN = process.env.MOLTBOT_AUTH_TOKEN || "";

// 创建 MCP Server
const server = new Server(
  {
    name: "moltbot",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 工具映射：Claude Code 工具名 -> Moltbot 工具名
const TOOL_MAP: Record<string, string> = {
  Bash: "exec",
  Read: "read",
  Write: "write",
  Edit: "edit",
  Glob: "ls",
  Grep: "grep",
};

// 注册工具：Bash
server.setRequestHandler("tools/list", async () => ({
  tools: [
    {
      name: "Bash",
      description: "Execute a shell command on the remote Moltbot server",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", description: "The command to execute" },
          timeout: { type: "number", description: "Timeout in milliseconds" },
          description: { type: "string", description: "Description of the command" },
        },
        required: ["command"],
      },
    },
    {
      name: "Read",
      description: "Read a file from the remote server",
      inputSchema: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Absolute path to the file" },
          offset: { type: "number", description: "Line number to start reading from" },
          limit: { type: "number", description: "Number of lines to read" },
        },
        required: ["file_path"],
      },
    },
    // 添加其他工具...
  ],
}));

// 处理工具调用
server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  // 映射工具名称
  const moltbotTool = TOOL_MAP[name] || name;

  try {
    // 调用 Moltbot Gateway API
    const response = await axios.post(
      `${MOLTBOT_GATEWAY_URL}/api/tools/execute`,
      {
        tool: moltbotTool,
        input: transformArgs(name, args),
      },
      {
        headers: {
          Authorization: `Bearer ${MOLTBOT_AUTH_TOKEN}`,
        },
        timeout: args.timeout || 120000,
      }
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data.result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}\n${error.response?.data || ""}`,
        },
      ],
      isError: true,
    };
  }
});

// 参数转换（Claude Code 格式 -> Moltbot 格式）
function transformArgs(tool: string, args: any): any {
  switch (tool) {
    case "Bash":
      return {
        command: args.command,
        timeout: args.timeout,
      };
    case "Read":
      return {
        path: args.file_path,
        start: args.offset,
        end: args.offset && args.limit ? args.offset + args.limit : undefined,
      };
    case "Write":
      return {
        path: args.file_path,
        content: args.content,
      };
    default:
      return args;
  }
}

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Moltbot MCP server running on stdio");
}

main();
```

**index.ts**（入口）：

```typescript
import "./server.js";
```

#### 3.2 安装依赖

```bash
cd ~/.config/claude-code/mcp-servers/moltbot/
npm install
```

#### 3.3 注册 MCP Server 到 Claude Code

编辑 Claude Code 配置：`~/.config/claude-code/config.json`

```json
{
  "mcpServers": {
    "moltbot": {
      "command": "node",
      "args": [
        "/Users/youruser/.config/claude-code/mcp-servers/moltbot/index.ts"
      ],
      "env": {
        "MOLTBOT_GATEWAY_URL": "http://100.101.102.103:18789",
        "MOLTBOT_AUTH_TOKEN": "your-secret-token-here"
      }
    }
  }
}
```

#### 3.4 测试集成

启动 Claude Code 并测试：

```bash
claude-code

# 在 Claude Code CLI 中：
User: "Run `git status` on the remote server"

# Claude Code 会调用 Bash 工具 → MCP Server → Moltbot Gateway → 远程执行
```

---

### Step 4: Moltbot Gateway API 实现

在 Moltbot 侧添加工具执行 API 端点（插件方式）：

**插件文件**：`plugins/claude-code-bridge/moltbot.plugin.ts`

```typescript
import { Type } from "@sinclair/typebox";
import type { MoltbotPluginDefinition } from "moltbot/plugin-sdk";

export const plugin: MoltbotPluginDefinition = {
  id: "claude-code-bridge",
  name: "Claude Code Bridge API",
  configSchema: {
    authToken: {
      type: "string",
      description: "Authentication token for API access",
      secret: true,
    },
  },

  register: (api) => {
    const config = api.getConfig();

    // 认证中间件
    const authenticate = (req: any, res: any, next: () => void) => {
      const authHeader = req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");

      if (token !== config.authToken) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      next();
    };

    // 健康检查端点
    api.registerHttpRoute("GET", "/health", async (req, res) => {
      res.json({ status: "ok", version: "1.0.0" });
    });

    // 工具执行端点
    api.registerHttpRoute(
      "POST",
      "/api/tools/execute",
      authenticate,
      async (req, res) => {
        const { tool, input } = req.body;

        if (!tool || !input) {
          res.status(400).json({ error: "Missing tool or input" });
          return;
        }

        try {
          // 创建临时 agent session
          const sessionKey = `api-${Date.now()}`;

          // 调用工具
          const result = await api.callTool(
            tool,
            input,
            {
              agentId: "claude-code-bridge",
              sessionKey,
              workspaceDir: process.cwd(),
            }
          );

          res.json({ success: true, result });
        } catch (error: any) {
          res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack,
          });
        }
      }
    );

    // 批量工具执行端点（优化性能）
    api.registerHttpRoute(
      "POST",
      "/api/tools/batch",
      authenticate,
      async (req, res) => {
        const { calls } = req.body; // Array<{ tool, input }>

        if (!Array.isArray(calls)) {
          res.status(400).json({ error: "Invalid calls format" });
          return;
        }

        try {
          const results = await Promise.all(
            calls.map(({ tool, input }) =>
              api.callTool(tool, input, {
                agentId: "claude-code-bridge",
                sessionKey: `api-${Date.now()}`,
                workspaceDir: process.cwd(),
              })
            )
          );

          res.json({ success: true, results });
        } catch (error: any) {
          res.status(500).json({
            success: false,
            error: error.message,
          });
        }
      }
    );

    api.logger.info("Claude Code Bridge API registered");
  },
};
```

**加载插件**：

将插件放到 `~/.clawdbot/plugins/claude-code-bridge/` 并在配置中启用：

```yaml
# ~/.clawdbot/config.yaml
plugins:
  loadPaths:
    - ~/.clawdbot/plugins

  config:
    claude-code-bridge:
      authToken: "your-secret-token-here"
```

重启 Gateway 后，API 端点即可使用。

---

## 高级功能

### 1. 多用户隔离

通过 Tailscale ACLs 或 JWT 认证实现用户隔离：

```yaml
# config.yaml
gateway:
  auth:
    enabled: true
    mode: jwt  # 或 basic/token
    jwtSecret: "your-jwt-secret"

# 每个用户配置独立的 agent
routing:
  users:
    - id: user-alice
      apiKey: "alice-token"
      agents:
        workspaceDir: /home/alice/projects
        tools:
          profile: coding

    - id: user-bob
      apiKey: "bob-token"
      agents:
        workspaceDir: /home/bob/projects
        tools:
          profile: minimal  # 限制权限
```

### 2. 工作区管理

为每个项目/团队创建独立工作区：

```bash
# 服务器端
mkdir -p ~/moltbot-workspaces/{project-a,project-b}

# 配置
routing:
  workspaces:
    - id: project-a
      path: ~/moltbot-workspaces/project-a
      gitRepo: git@github.com:org/project-a.git
      tools:
        exec:
          allowlist:
            - "npm *"
            - "git *"

    - id: project-b
      path: ~/moltbot-workspaces/project-b
      gitRepo: git@github.com:org/project-b.git
      tools:
        profile: full
```

### 3. 审计日志

启用详细的工具执行日志：

```yaml
log:
  level: debug
  auditLog:
    enabled: true
    file: ~/.clawdbot/logs/audit.jsonl
    includeToolCalls: true
    includeResults: true
```

查看审计日志：

```bash
# 查看最近 100 条工具调用
cat ~/.clawdbot/logs/audit.jsonl | jq 'select(.type == "tool_call")' | tail -100

# 过滤特定用户
cat ~/.clawdbot/logs/audit.jsonl | jq 'select(.userId == "alice")'
```

---

## 安全最佳实践

### 1. 网络隔离

- ✅ 使用 Tailscale（零信任网络）
- ✅ 配置防火墙规则（仅允许 Tailscale IPs）
- ❌ 不要将 Gateway 暴露到公网（除非通过 Cloudflare Access）

### 2. 认证授权

- ✅ 启用 Gateway 认证（`gateway.auth.enabled: true`）
- ✅ 使用强随机密钥（至少 32 字符）
- ✅ 定期轮换密钥
- ✅ 为每个用户/客户端使用独立密钥

### 3. 权限控制

- ✅ 默认使用 `tools.profile: coding`（不启用 web/message 工具）
- ✅ exec 工具使用白名单模式（`security: allowlist`）
- ✅ 启用 ask 模式（`ask: on-miss` 或 `always`）
- ✅ 禁用不必要的工具（如 `browser`, `canvas`）

### 4. 沙箱隔离

启用 Docker 沙箱执行：

```yaml
tools:
  exec:
    defaultTarget: sandbox  # 默认在沙箱执行

sandbox:
  enabled: true
  image: moltbot/sandbox:latest
  limits:
    memory: 2GB
    cpus: 2
    timeout: 300000  # 5 分钟
```

---

## 性能优化

### 1. 连接池

MCP Server 侧维护 HTTP 连接池：

```typescript
const axiosInstance = axios.create({
  baseURL: MOLTBOT_GATEWAY_URL,
  timeout: 120000,
  maxRedirects: 0,
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
});
```

### 2. 批量工具调用

Claude Code 侧合并多个工具调用：

```typescript
// 不推荐：多次请求
await callTool("Bash", { command: "git status" });
await callTool("Bash", { command: "git log -1" });

// 推荐：批量请求
await axios.post("/api/tools/batch", {
  calls: [
    { tool: "exec", input: { command: "git status" } },
    { tool: "exec", input: { command: "git log -1" } },
  ],
});
```

### 3. 输出流式传输

对于长时间运行的命令，使用 WebSocket 流式传输输出：

```typescript
// Moltbot 插件侧
api.registerWebSocketRoute("/ws/tools/stream", (ws, req) => {
  ws.on("message", async (data) => {
    const { tool, input } = JSON.parse(data.toString());

    // 工具执行时实时发送输出
    await api.callTool(tool, input, {
      onUpdate: (chunk) => {
        ws.send(JSON.stringify({ type: "output", data: chunk }));
      },
    });

    ws.send(JSON.stringify({ type: "done" }));
  });
});
```

---

## 故障排查

### 问题 1：MCP Server 无法连接到 Gateway

**排查步骤**：

```bash
# 1. 测试网络连通性
ping 100.101.102.103

# 2. 测试 HTTP 连接
curl http://100.101.102.103:18789/health

# 3. 检查认证
curl -H "Authorization: Bearer your-token" \
  http://100.101.102.103:18789/api/tools/execute \
  -d '{"tool":"exec","input":{"command":"echo test"}}'

# 4. 查看 Gateway 日志
tail -f ~/.clawdbot/logs/gateway.log
```

### 问题 2：工具调用权限被拒绝

**查看策略配置**：

```bash
moltbot config get tools.profile
moltbot config get tools.exec.security
moltbot config get tools.exec.allowlist
```

**临时放开权限（测试）**：

```bash
moltbot config set tools.exec.security full
moltbot config set tools.exec.ask off
```

### 问题 3：性能慢

**启用性能分析**：

```yaml
log:
  level: debug
  performance:
    enabled: true
    slowToolThreshold: 1000  # 记录超过 1 秒的工具调用
```

**查看慢查询**：

```bash
cat ~/.clawdbot/logs/gateway.log | grep "slow_tool"
```

---

## 总结

通过以上方案，可以实现：

1. **Claude Code 保持原有 CLI 体验**，用户无感知
2. **工具执行在远程 Moltbot 服务器**，支持强大的权限控制和隔离
3. **多用户共享同一后端**，每个用户独立工作区
4. **跨平台访问**，通过 Telegram/Discord 也能控制同一后端
5. **安全可控**，通过 Tailscale + 白名单 + 审计日志保证安全

### 下一步行动：

1. 部署测试环境：使用 ngrok 快速验证方案
2. 开发 MCP Server 插件：按照上述代码模板实现
3. 生产部署：使用 Tailscale + systemd 长期运行
4. 监控告警：集成 Prometheus + Grafana 监控 Gateway 性能
