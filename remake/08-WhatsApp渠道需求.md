# 08 - WhatsApp渠道需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 07-渠道抽象层需求
> **后续文档**: 09-Telegram渠道需求

---

## 1. 需求概述

### 1.1 目标描述

实现 **WhatsApp 消息渠道**，基于 Baileys 库实现 WhatsApp Web 协议，支持二维码认证、消息收发、媒体处理、群组管理等完整功能。

**核心目标:**
- **协议实现**: 完整实现 WhatsApp Web 协议
- **多设备支持**: 支持多设备配对
- **媒体处理**: 支持图片、视频、音频、文档
- **群组支持**: 支持群组消息和群组管理

**代表性**: WhatsApp 是最复杂的 Web 协议渠道，没有官方 API，需要完整的协议逆向实现，具有最高的技术复杂度。

### 1.2 业务场景

#### 场景 1: 二维码认证
**用户操作**: 首次使用，需要扫码登录。

**流程**:
```
1. 启动 WhatsApp 渠道
2. 生成配对二维码
3. 用户扫码
4. 保存认证会话到 ~/.clawdbot/whatsapp-session/
```

#### 场景 2: 接收文本消息
**用户操作**: 用户在 WhatsApp 发送 "Hello"。

**处理流程**: 参考文档 07-渠道抽象层需求

#### 场景 3: 发送媒体消息
**Agent 操作**: Agent 需要发送图片。

**流程**:
```
1. Agent 生成图片 URL
2. 下载图片
3. 上传到 WhatsApp 服务器
4. 发送媒体消息
```

---

## 2. 核心概念

### 2.1 Baileys 库

**定义**: WhatsApp Web 协议的 Node.js 实现。

**核心功能**:
- 二维码/配对码认证
- 消息收发
- 媒体上传/下载
- 群组管理
- 会话持久化

### 2.2 会话持久化

**位置**: `~/.clawdbot/whatsapp-session/`

**内容**:
- `creds.json` - 认证凭据
- `keys/` - 加密密钥
- `contacts/` - 联系人缓存

### 2.3 消息类型

| 类型 | 说明 |
|------|------|
| `conversation` | 纯文本消息 |
| `imageMessage` | 图片消息 |
| `videoMessage` | 视频消息 |
| `audioMessage` | 音频消息 |
| `documentMessage` | 文档消息 |

---

## 3. 关键实现

### 3.1 实现步骤

#### 步骤 1: 启动 WhatsApp 渠道

```typescript
import makeWASocket from '@whiskeysockets/baileys';

export async function startWhatsAppChannel(cfg: MoltbotConfig) {
  const { state, saveCreds } = await useMultiFileAuthState(
    '~/.clawdbot/whatsapp-session'
  );

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages) {
      await processMessage(msg, cfg);
    }
  });

  return { stop: () => sock.end() };
}
```

#### 步骤 2: 发送消息

```typescript
export async function sendMessageWhatsApp(params: {
  to: string;
  text: string;
  mediaUrls?: string[];
}) {
  const jid = toWhatsappJid(params.to);

  if (params.mediaUrls) {
    // 发送媒体
    for (const url of params.mediaUrls) {
      const buffer = await downloadMedia(url);
      await sock.sendMessage(jid, {
        image: buffer,
        caption: params.text
      });
    }
  } else {
    // 发送文本
    await sock.sendMessage(jid, {
      text: params.text
    });
  }
}
```

---

## 4. 验收标准

### 4.1 功能验收

#### 验收项 1: 二维码认证

**测试步骤**:
1. 首次启动 WhatsApp 渠道
2. 扫描二维码
3. 验证认证成功

**通过标准**:
- 二维码正常显示
- 扫码后连接成功

#### 验收项 2: 消息收发

**测试步骤**:
1. 发送测试消息到 WhatsApp
2. Agent 回复
3. 验证收到回复

**通过标准**:
- 消息正常接收
- 回复正常发送

---

**文档完成** ✅
