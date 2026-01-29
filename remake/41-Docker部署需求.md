# 41 - Docker部署需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 04-Gateway基础架构需求
> **后续文档**: 42-云平台部署需求

---

## 1. 需求概述

实现**Docker 容器化部署**，简化部署流程。

**核心目标:**
- **Dockerfile**: 多阶段构建
- **Docker Compose**: 一键启动
- **持久化**: 数据卷挂载

---

## 2. Dockerfile

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 8080
CMD ["node", "dist/cli/index.js", "gateway", "run"]
```

---

## 3. Docker Compose

```yaml
version: '3.8'
services:
  moltbot:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - moltbot-data:/root/.clawdbot
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}

volumes:
  moltbot-data:
```

---

**文档完成** ✅
