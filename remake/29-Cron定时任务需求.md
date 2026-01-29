# 29 - Cron定时任务需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 12-会话管理需求, 16-Agent执行循环需求
> **后续文档**: 30-配置热重载需求

---

## 1. 需求概述

### 1.1 目标描述

实现**Cron 定时任务调度系统**，支持定时执行 Agent 任务。

**核心目标:**
- **Cron 表达式**: 支持标准 Cron 语法
- **任务管理**: 添加、删除、列出任务
- **持久化**: 任务配置持久化存储
- **执行日志**: 记录任务执行历史

---

## 2. 核心概念

### 2.1 Cron 表达式

**格式**: `* * * * *` (分 时 日 月 周)

**示例**:
- `0 9 * * *`: 每天早上 9 点
- `*/30 * * * *`: 每 30 分钟
- `0 0 * * 0`: 每周日午夜

### 2.2 任务结构

```typescript
type CronTask = {
  id: string;
  schedule: string;          // Cron 表达式
  prompt: string;            // Agent 执行的提示
  agentId?: string;          // Agent ID
  sessionKey?: string;       // 会话 Key
  enabled: boolean;
  lastRun?: string;          // 上次运行时间
  nextRun?: string;          // 下次运行时间
  createdAt: string;
};
```

---

## 3. 实现

### 3.1 任务调度

```typescript
import cron from 'node-cron';

export class CronScheduler {
  private tasks = new Map<string, cron.ScheduledTask>();

  addTask(task: CronTask) {
    const scheduled = cron.schedule(task.schedule, async () => {
      await this.executeTask(task);
    });

    this.tasks.set(task.id, scheduled);
  }

  removeTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.stop();
      this.tasks.delete(taskId);
    }
  }

  private async executeTask(task: CronTask) {
    // 运行 Agent
    await runEmbeddedPiAgent({
      sessionId: task.sessionKey || 'cron-default',
      agentId: task.agentId || 'main',
      prompt: task.prompt,
      onEvent: (event) => {
        // 处理事件
      }
    });
  }
}
```

### 3.2 任务存储

**位置**: `~/.clawdbot/cron-tasks.json`

```json
{
  "tasks": [
    {
      "id": "daily-report",
      "schedule": "0 9 * * *",
      "prompt": "Generate daily report",
      "agentId": "main",
      "enabled": true,
      "createdAt": "2026-01-29T10:00:00Z"
    }
  ]
}
```

---

**文档完成** ✅
