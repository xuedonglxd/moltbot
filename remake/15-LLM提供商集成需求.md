# 15 - LLM提供商集成需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 14-Agent基础架构需求
> **后续文档**: 16-Agent执行循环需求

---

## 1. 需求概述

### 1.1 目标描述

实现**多 AI 提供商的统一集成接口**，支持 Anthropic、OpenAI、Google Gemini、AWS Bedrock 等主流 AI 提供商，提供统一的 API 抽象、认证管理、模型回退等功能。

**核心目标:**
- **提供商抽象**: 统一的 AI 客户端接口
- **多认证方式**: 支持 API Key、OAuth、Token 等认证
- **模型别名**: 支持简短的模型别名（如 "sonnet"）
- **认证轮换**: 多个认证配置自动轮换

---

## 2. 核心概念

### 2.1 支持的提供商

| 提供商 | ID | 认证方式 | 模型示例 |
|--------|----|---------| --------|
| Anthropic | `anthropic` | API Key / OAuth | claude-sonnet-4-5 |
| OpenAI | `openai` | API Key | gpt-5.2 |
| Google Gemini | `google` | API Key | gemini-3-pro |
| AWS Bedrock | `bedrock` | AWS Credentials | claude-3-sonnet |

### 2.2 模型引用格式

**完整格式**: `<provider>/<model-id>`

**示例**:
- `anthropic/claude-sonnet-4-5`
- `openai/gpt-5.2`
- `google/gemini-3-pro`

**别名支持**:
```json5
{
  models: {
    aliases: {
      "sonnet": "anthropic/claude-sonnet-4-5",
      "gpt": "openai/gpt-5.2"
    }
  }
}
```

### 2.3 认证配置

```json5
{
  auth: {
    profiles: {
      "anthropic-main": {
        provider: "anthropic",
        mode: "api_key",
        email: "user@example.com"
      },
      "openai-main": {
        provider: "openai",
        mode: "api_key"
      }
    },
    order: {
      "anthropic": ["anthropic-main"],
      "openai": ["openai-main"]
    }
  }
}
```

---

## 3. 关键实现

### 3.1 实现步骤

#### 步骤 1: 解析模型引用

```typescript
export function parseModelRef(ref: string): {
  provider: string;
  model: string;
} {
  // 检查别名
  const alias = MODEL_ALIASES[ref.toLowerCase()];
  if (alias) ref = alias;

  // 解析格式: provider/model
  const [provider, model] = ref.split('/');
  return { provider, model };
}
```

#### 步骤 2: 获取 API Key

```typescript
export function getApiKeyForModel(
  provider: string,
  cfg: MoltbotConfig
): string | null {
  // 1. 从认证配置获取
  const profiles = cfg.auth?.profiles ?? {};
  const order = cfg.auth?.order?.[provider] ?? [];

  for (const profileId of order) {
    const profile = profiles[profileId];
    if (profile?.mode === 'api_key') {
      return process.env[`${provider.toUpperCase()}_API_KEY`];
    }
  }

  // 2. 从环境变量获取
  return process.env[`${provider.toUpperCase()}_API_KEY`];
}
```

---

**文档完成** ✅
