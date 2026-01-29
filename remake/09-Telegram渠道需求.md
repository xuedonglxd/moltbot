# 09 - Telegram渠道需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 07-渠道抽象层需求
> **后续文档**: 10-其他主流渠道需求

---

## 1. 需求概述

### 1.1 目标描述

实现 **Telegram Bot 渠道**，基于 Grammy 框架实现 Telegram Bot API，支持 Bot Token 认证、长轮询/Webhook 模式、消息收发、命令处理、群组管理等功能。

**核心目标:**
- **Bot API**: 使用官方 Bot API
- **长轮询模式**: 默认使用长轮询获取消息
- **Webhook 模式**: 支持 Webhook 接收消息（可选）
- **命令支持**: 支持 Telegram Bot Commands（/start、/help 等）

**代表性**: Telegram 是最典型的 Bot API 渠道，官方 API 支持完善，是其他 Bot 类渠道（Discord、Slack）的参考实现。

### 1.2 业务场景

#### 场景 1: Bot Token 认证
**用户操作**: 配置 Telegram Bot。

**配置**:
```json5
{
  channels: {
    telegram: {
      enabled: true,
      accounts: [
        {
          id: "default",
          token: "${TELEGRAM_BOT_TOKEN}"
        }
      ]
    }
  }
}
```

#### 场景 2: 接收和回复消息
**用户操作**: 用户在 Telegram 发送 "/start"。

**流程**:
```
1. Telegram 服务器推送消息
2. Grammy 接收消息
3. 处理命令（如果是命令）
4. 否则，转发给 Agent
5. Agent 回复
6. 发送回复到 Telegram
```

#### 场景 3: 群组消息
**用户操作**: 用户在群组中 @bot。

**流程**:
```
1. 接收群组消息
2. 检查是否提及 Bot
3. 如果提及，处理消息
4. 回复到群组（引用原消息）
```

---

## 2. 核心概念

### 2.1 Grammy 框架

**定义**: Telegram Bot API 的 TypeScript 框架。

**核心功能**:
- Bot 实例创建
- 消息处理
- 命令注册
- 中间件支持

### 2.2 长轮询 vs Webhook

**长轮询（Polling）**:
- Bot 主动向 Telegram 服务器请求消息
- 适合开发环境和本地部署
- 无需公网 IP

**Webhook**:
- Telegram 服务器推送消息到 Bot
- 适合生产环境
- 需要公网 IP 和 HTTPS

### 2.3 Telegram 消息类型

| 类型 | 说明 |
|------|------|
| `text` | 文本消息 |
| `photo` | 图片消息 |
| `video` | 视频消息 |
| `document` | 文档消息 |
| `audio` | 音频消息 |
| `voice` | 语音消息 |

---

## 3. 关键实现

### 3.1 实现步骤

#### 步骤 1: 启动 Telegram Bot

```typescript
import { Bot } from 'grammy';

export async function startTelegramChannel(cfg: MoltbotConfig) {
  const token = cfg.channels?.telegram?.accounts?.[0]?.token;
  if (!token) throw new Error('Missing Telegram token');

  const bot = new Bot(token);

  // 注册消息处理器
  bot.on('message', async (ctx) => {
    await processMessage({
      channel: 'telegram',
      accountId: 'default',
      messageId: String(ctx.message.message_id),
      from: String(ctx.from.id),
      to: String(ctx.me.id),
      chatType: ctx.chat.type === 'private' ? 'direct' : 'group',
      text: ctx.message.text ?? '',
      senderName: ctx.from.first_name,
    }, cfg);
  });

  // 启动长轮询
  await bot.start();

  return { stop: () => bot.stop() };
}
```

#### 步骤 2: 发送消息

```typescript
export async function sendMessageTelegram(params: {
  chatId: string;
  text: string;
  replyToMessageId?: number;
}) {
  await bot.api.sendMessage(params.chatId, params.text, {
    reply_to_message_id: params.replyToMessageId,
    parse_mode: 'Markdown',
  });
}
```

---

## 4. 验收标准

### 4.1 功能验收

#### 验收项 1: Bot 启动

**测试步骤**:
1. 配置 Bot Token
2. 启动 Gateway
3. 验证 Bot 在线

**通过标准**:
- Bot 成功连接到 Telegram
- 可以接收消息

---

**文档完成** ✅
