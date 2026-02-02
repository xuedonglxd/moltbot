# 仅用 Skill 和 Prompt 实现完整开发测试流程的可行性分析

> **版本**: v1.0
> **创建时间**: 2026-01-29
> **核心问题**: 不开发任何新功能，仅靠 Skill + Prompt 能否实现协调 Claude Code + Browser 完成全栈开发测试？

---

## 1. 核心结论

**答案：可以！但有限制。**

### 1.1 为什么可以？

Moltbot 已经内置了**所有必需的工具**：

```
已有工具清单：
✅ sessions_spawn     - 创建子 Agent
✅ sessions_send      - 发送任务
✅ sessions_history   - 获取历史
✅ bash               - 运行命令（测试、构建、服务器）
✅ browser_navigate   - 导航页面
✅ browser_click      - 点击元素
✅ browser_type       - 输入文本
✅ browser_screenshot - 截图
✅ browser_eval       - 执行 JS
✅ read_file          - 读文件
✅ write_file         - 写文件
✅ edit_file          - 编辑文件
```

**Skill 只需要教 Agent 如何组合使用这些工具！**

### 1.2 Skill 的本质

```
┌─────────────────────────────────────────────┐
│ Skill = 教学文档                            │
│                                             │
│ ❌ 不是：代码实现                           │
│ ✅ 是：使用现有工具的指南                   │
│                                             │
│ 类比：                                      │
│ - 代码 = 工具箱（hammer, saw, drill）      │
│ - Skill = 木工教程（如何组合工具造桌子）   │
└─────────────────────────────────────────────┘
```

---

## 2. 可行性验证

### 2.1 核心流程拆解

让我们分析"开发 + 测试"流程的每一步是否可以用现有工具实现：

```
┌──────────────────────────────────────────────────────────┐
│ 步骤 1: 创建 Code Agent                                  │
├──────────────────────────────────────────────────────────┤
│ 工具: sessions_spawn                          ✅ 已有   │
│ Skill 教学: 如何设置 Code Agent 参数                    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 2: 发送开发任务                                     │
├──────────────────────────────────────────────────────────┤
│ 工具: sessions_send                           ✅ 已有   │
│ Skill 教学: 如何编写清晰的任务描述                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 3: 监控开发进度                                     │
├──────────────────────────────────────────────────────────┤
│ 工具: sessions_history                        ✅ 已有   │
│ Skill 教学: 如何判断 Code Agent 是否完成                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 4: 运行 Unit Test                                   │
├──────────────────────────────────────────────────────────┤
│ 工具: bash                                    ✅ 已有   │
│ Skill 教学: 如何解析测试输出，判断成功/失败             │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 5: 启动开发服务器                                   │
├──────────────────────────────────────────────────────────┤
│ 工具: bash                                    ✅ 已有   │
│ Skill 教学: 如何后台启动服务器，检查是否就绪            │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 6: 执行浏览器 E2E 测试                              │
├──────────────────────────────────────────────────────────┤
│ 工具: browser_navigate, browser_click, etc.  ✅ 已有   │
│ Skill 教学: 如何编写测试步骤，验证结果                  │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 7: 截图对比（视觉回归）                             │
├──────────────────────────────────────────────────────────┤
│ 工具: browser_screenshot + bash (pixelmatch) ✅ 已有   │
│ Skill 教学: 如何对比截图，判断差异                      │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 8: 测试失败时修复                                   │
├──────────────────────────────────────────────────────────┤
│ 工具: sessions_send                           ✅ 已有   │
│ Skill 教学: 如何格式化错误报告发给 Code Agent          │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ 步骤 9: 生成测试报告                                     │
├──────────────────────────────────────────────────────────┤
│ 工具: write_file                              ✅ 已有   │
│ Skill 教学: 如何组织报告内容（Markdown/JSON）          │
└──────────────────────────────────────────────────────────┘
```

**结论**: 每一步都可以用现有工具实现！✅

---

## 3. 实现方案：纯 Skill + Prompt

### 3.1 核心 Skill 设计

#### Skill 1: Full-Stack Dev Orchestrator

**文件**: `~/clawd/skills/fullstack-dev/SKILL.md`

```markdown
---
name: fullstack-dev
description: Orchestrate full-stack development with Code Agent and E2E testing
user-invocable: true
---

# Full-Stack Development Orchestrator

Coordinate Code Agent for development and Browser tools for E2E testing.

## Workflow

### Phase 1: Setup

1. **Create Code Agent**
   \```javascript
   sessions_spawn({
     agentId: "code-dev",
     model: "anthropic/claude-sonnet-4-5",
     instructions: "You are a frontend developer. Write clean React/TypeScript code with comprehensive unit tests.",
     tools: ["read_file", "write_file", "edit_file", "bash", "glob", "grep"],
     workspace: "{project-dir}"
   })
   \```

2. **Record plan to AGENTS.md**
   \```javascript
   write_file({
     path: "AGENTS.md",
     content: `
## Current Project: {project-name}

### Plan
1. Code Agent develops features
2. Run unit tests
3. Start dev server
4. E2E browser tests
5. Visual regression tests
6. Generate report

### Status
- [ ] Development
- [ ] Unit tests
- [ ] E2E tests
- [ ] Report
     `,
     mode: "append"
   })
   \```

### Phase 2: Development

3. **Send development task**
   \```javascript
   sessions_send({
     targetSessionKey: "agent:main:code-dev",
     message: "{detailed-requirements}"
   })
   \```

4. **Monitor progress (check every 5 seconds)**
   \```javascript
   sessions_history({
     sessionKey: "agent:main:code-dev",
     limit: 5
   })
   \```

   **Completion indicators**:
   - Last message contains "完成" or "done" or "ready"
   - No new tool calls in last 10 seconds

### Phase 3: Unit Testing

5. **Run unit tests**
   \```bash
   cd {project-dir} && npm test
   \```

6. **If tests fail**:
   - Parse error output
   - Send fix request to Code Agent:
   \```javascript
   sessions_send({
     targetSessionKey: "agent:main:code-dev",
     message: `
Unit tests failed:

\`\`\`
{error-output}
\`\`\`

Please fix the failing tests.
     `
   })
   \```
   - Return to step 4 (monitor progress)

7. **If tests pass**:
   - Record to AGENTS.md:
   \```
   - [x] Unit tests: {passed}/{total} ✅
   \```

### Phase 4: E2E Testing

8. **Start dev server**
   \```bash
   cd {project-dir} && npm run dev > server.log 2>&1 &
   echo $! > .server.pid
   \```

9. **Wait for server ready**
   \```bash
   for i in {1..20}; do
     curl -s http://localhost:3000 > /dev/null && echo "ready" && break
     sleep 1
   done
   \```

10. **Execute browser tests**
    \```javascript
    // Navigate to app
    browser_navigate({ url: "http://localhost:3000" })

    // Wait for page load
    browser_eval({ script: "document.readyState === 'complete'" })

    // Take baseline screenshot
    browser_screenshot({ path: "{project-dir}/screenshots/baseline.png" })

    // Run test scenarios (see "E2E Test Patterns" below)
    \```

### Phase 5: Visual Regression

11. **Compare screenshots**
    \```bash
    cd {project-dir}/screenshots
    pixelmatch baseline.png current.png diff.png 0.1
    \```

12. **If differences detected**:
    - Send analysis to Code Agent with diff.png
    - Ask user if change is intentional

### Phase 6: Reporting

13. **Generate test report**
    \```javascript
    write_file({
      path: "{project-dir}/test-report.md",
      content: `
# Test Report: {project-name}

## Summary
- Unit Tests: {passed}/{total} ✅
- E2E Tests: {passed}/{total} ✅
- Visual Regression: ✅

## Screenshots
![Baseline](screenshots/baseline.png)
![After Test](screenshots/current.png)

## Coverage
- Lines: {coverage}%
      `
    })
    \```

14. **Cleanup**
    \```bash
    kill $(cat .server.pid)
    rm .server.pid
    \```

## E2E Test Patterns

### Pattern 1: Form Interaction
\```javascript
// Type into input
browser_type({
  selector: "#username",
  text: "testuser"
})

// Click submit
browser_click({ selector: "#submit" })

// Wait for response
browser_eval({
  script: "document.querySelector('.success-message') !== null"
})

// Verify result
browser_eval({
  script: "document.querySelector('.success-message').textContent"
})
\```

### Pattern 2: List Operations
\```javascript
// Add item
browser_type({ selector: "#new-item", text: "Task 1" })
browser_click({ selector: "#add-button" })

// Verify item added
const items = browser_eval({
  script: `Array.from(document.querySelectorAll('.item')).map(el => el.textContent)`
})

// Assert
if (!items.includes("Task 1")) {
  // Report failure
}
\```

### Pattern 3: Navigation
\```javascript
// Click link
browser_click({ selector: "a[href='/about']" })

// Wait for navigation
browser_eval({ script: "location.pathname === '/about'" })

// Take screenshot
browser_screenshot({ path: "screenshots/about-page.png" })
\```

## Error Handling

### Code Agent Not Responding
\```javascript
const history = sessions_history({
  sessionKey: "agent:main:code-dev",
  limit: 10
})

if (history.length === 0) {
  // Agent crashed or never started
  // Re-spawn
}

const lastUpdate = history[history.length - 1].timestamp
const idleTime = Date.now() - lastUpdate

if (idleTime > 60000) {
  // Agent idle for 1 minute
  // Send ping or re-spawn
}
\```

### Browser Test Timeout
\```javascript
// Set timeout for each action
browser_navigate({ url: "...", timeout: 30000 })

// Retry on failure
let retries = 3
while (retries > 0) {
  try {
    browser_click({ selector: "#button" })
    break
  } catch (error) {
    retries--
    if (retries === 0) {
      // Report failure with screenshot
      browser_screenshot({ path: "error.png" })
    }
  }
}
\```

## Best Practices

1. **Always check server status before browser tests**
2. **Take screenshots at each major step**
3. **Record all test results to AGENTS.md**
4. **Send detailed error reports to Code Agent**
5. **Clean up resources (server, browser) when done**

## Example Usage

User: "开发一个 Todo List，包括添加、完成、删除功能，并进行完整测试"

Agent:
1. Creates Code Agent
2. Sends detailed requirements
3. Monitors development
4. Runs unit tests
5. Starts server
6. Tests in browser:
   - Add task ✅
   - Complete task ✅
   - Delete task ✅
7. Generates report with screenshots
```

### 3.2 辅助 Skill

#### Skill 2: Code Agent Monitor

```markdown
---
name: code-agent-monitor
description: Monitor Code Agent progress and detect completion
---

# Code Agent Monitor

Helper skill to monitor Code Agent status.

## Check Completion

\```javascript
// Get recent history
const history = sessions_history({
  sessionKey: "agent:main:{agentId}",
  limit: 10
})

// Completion signals
const lastMessage = history[history.length - 1]
const isComplete =
  lastMessage.role === "assistant" &&
  (lastMessage.content.includes("完成") ||
   lastMessage.content.includes("done") ||
   lastMessage.content.includes("finished"))

// Check for tool activity
const recentTools = history.slice(-5).filter(msg => msg.tool_calls)
const isIdle = recentTools.length === 0

if (isComplete || isIdle) {
  return "READY"
} else {
  return "IN_PROGRESS"
}
\```

## Parse Test Output

\```javascript
// Parse npm test output
const output = bash({ command: "npm test" })

if (output.exitCode === 0) {
  // Extract passed/total
  const match = output.stdout.match(/(\d+) passed/)
  const passed = match ? match[1] : "unknown"

  return {
    status: "PASSED",
    passed: passed,
    coverage: extractCoverage(output.stdout)
  }
} else {
  return {
    status: "FAILED",
    errors: output.stderr,
    failedTests: extractFailedTests(output.stderr)
  }
}
\```
```

#### Skill 3: E2E Test Runner

```markdown
---
name: e2e-test-runner
description: Standardized E2E test execution patterns
---

# E2E Test Runner

Reusable patterns for browser E2E testing.

## Test Structure

Each test is a sequence of steps:

\```javascript
const test = {
  name: "User can add a task",
  steps: [
    {
      action: "navigate",
      url: "http://localhost:3000"
    },
    {
      action: "wait",
      condition: "document.readyState === 'complete'"
    },
    {
      action: "screenshot",
      path: "screenshots/before-add.png"
    },
    {
      action: "type",
      selector: "#new-task",
      text: "Buy groceries"
    },
    {
      action: "click",
      selector: "#add-button"
    },
    {
      action: "assert",
      script: "document.querySelectorAll('.task-item').length === 1",
      expected: true
    },
    {
      action: "screenshot",
      path: "screenshots/after-add.png"
    }
  ]
}
\```

## Execute Test

\```javascript
for (const step of test.steps) {
  try {
    switch (step.action) {
      case "navigate":
        browser_navigate({ url: step.url })
        break

      case "wait":
        // Poll until condition is true
        let timeout = 10000
        const start = Date.now()
        while (Date.now() - start < timeout) {
          const result = browser_eval({ script: step.condition })
          if (result) break
          // Wait 100ms
        }
        break

      case "screenshot":
        browser_screenshot({ path: step.path })
        break

      case "type":
        browser_type({
          selector: step.selector,
          text: step.text
        })
        break

      case "click":
        browser_click({ selector: step.selector })
        break

      case "assert":
        const actual = browser_eval({ script: step.script })
        if (actual !== step.expected) {
          throw new Error(`Assertion failed: expected ${step.expected}, got ${actual}`)
        }
        break
    }
  } catch (error) {
    // Test failed
    browser_screenshot({ path: "screenshots/error.png" })
    return {
      passed: false,
      failedStep: step,
      error: error.message,
      screenshot: "screenshots/error.png"
    }
  }
}

return { passed: true }
\```
```

---

## 4. 纯 Prompt 方案

**除了 Skill，还可以通过系统提示（System Prompt）实现！**

### 4.1 方案：Bootstrap 文件注入

**文件**: `~/clawd/AGENTS.md`

```markdown
# Agent Instructions

## Full-Stack Development Workflow

When user requests to develop a web application with testing, follow this **exact workflow**:

### Step 1: Plan
1. Analyze requirements
2. Record plan to AGENTS.md:
   \```
   ## Project: {name}
   ### Requirements
   - Feature 1
   - Feature 2
   ### Testing Strategy
   - Unit tests
   - E2E tests
   ### Status
   - [ ] Development
   - [ ] Testing
   \```

### Step 2: Create Code Agent
\```javascript
sessions_spawn({
  agentId: "code-dev",
  model: "anthropic/claude-sonnet-4-5",
  instructions: "Frontend developer. Write React/TypeScript with tests.",
  tools: ["read_file", "write_file", "edit_file", "bash", "glob", "grep"]
})
\```

### Step 3: Send Task
\```javascript
sessions_send({
  targetSessionKey: "agent:main:code-dev",
  message: "Detailed requirements here..."
})
\```

### Step 4: Monitor (poll every 5 seconds)
\```javascript
sessions_history({ sessionKey: "agent:main:code-dev", limit: 5 })
\```

Check if:
- Last message contains "完成" or "done"
- No tool activity in last 10 seconds

### Step 5: Unit Test
\```bash
cd project && npm test
\```

If failed:
- Parse errors
- Send fix request to Code Agent
- Return to Step 4

### Step 6: Start Server
\```bash
cd project && npm run dev > server.log 2>&1 &
echo $! > .server.pid
\```

Wait for ready:
\```bash
for i in {1..20}; do
  curl -s http://localhost:3000 && break
  sleep 1
done
\```

### Step 7: E2E Tests
\```javascript
browser_navigate({ url: "http://localhost:3000" })
browser_screenshot({ path: "screenshots/initial.png" })

// Run test scenarios
// Example: Add task
browser_type({ selector: "#input", text: "Task 1" })
browser_click({ selector: "#add" })
browser_screenshot({ path: "screenshots/after-add.png" })

// Verify
const tasks = browser_eval({
  script: "Array.from(document.querySelectorAll('.task')).map(el => el.textContent)"
})

if (!tasks.includes("Task 1")) {
  // Test failed, notify Code Agent
}
\```

### Step 8: Visual Regression
\```bash
cd screenshots
pixelmatch baseline.png initial.png diff.png 0.1
\```

### Step 9: Report
\```javascript
write_file({
  path: "test-report.md",
  content: `
# Test Report

## Summary
- Unit: {passed}/{total}
- E2E: {passed}/{total}

## Screenshots
![Initial](screenshots/initial.png)
![After Add](screenshots/after-add.png)
  `
})
\```

### Step 10: Cleanup
\```bash
kill $(cat .server.pid)
rm .server.pid
\```

---

## CRITICAL: Always Follow This Workflow

When user says:
- "开发一个 XXX 并测试"
- "Build a XXX with E2E tests"
- "Create XXX and test it"

→ Execute the 10-step workflow above **exactly**.

Do NOT skip steps. Do NOT ask for permission between steps.
```

### 4.2 优势与劣势

**优势**:
- ✅ 无需编写 Skill 文件
- ✅ 更新更方便（直接编辑 AGENTS.md）
- ✅ 可以更灵活（prompt 更自由）

**劣势**:
- ❌ Token 消耗更大（每次都发送完整 prompt）
- ❌ 可能被 Agent "遗忘"（上下文太长）
- ❌ 难以复用（每个项目都要配置）

---

## 5. 两种方案对比

### 5.1 Skill 方案 vs Prompt 方案

| 维度 | Skill 方案 | Prompt 方案 (AGENTS.md) |
|------|-----------|------------------------|
| **实现方式** | 创建 SKILL.md 文件 | 编辑 AGENTS.md |
| **Token 消耗** | 较低（按需注入） | 较高（每次都发送） |
| **灵活性** | 中等（结构化） | 高（自由文本） |
| **复用性** | 高（可安装/分享） | 低（项目特定） |
| **维护性** | 好（模块化） | 中等（集中管理） |
| **学习曲线** | 需要理解 Skill 格式 | 简单（直接写 markdown） |
| **调试难度** | 中等 | 容易 |

### 5.2 推荐方案

**场景 1: 通用流程（可复用）**
→ 使用 **Skill 方案**

例如：
- Full-Stack Dev Orchestrator
- E2E Test Runner
- Visual Regression Testing

这些流程可以在多个项目中复用，适合封装为 Skill。

**场景 2: 项目特定流程**
→ 使用 **Prompt 方案 (AGENTS.md)**

例如：
- 特定项目的测试策略
- 公司内部的开发规范
- 一次性任务流程

这些流程只在当前项目使用，直接写在 AGENTS.md 更方便。

**最佳实践: 组合使用**
```
AGENTS.md (项目特定):
  "使用 fullstack-dev skill 开发 XXX 功能"

Skill (通用流程):
  fullstack-dev skill 定义标准流程
```

---

## 6. 实战演示

### 6.1 场景：仅用 Skill 开发 Todo List

**用户输入**:
```
帮我开发一个 Todo List，包括添加、完成、删除功能，并进行完整测试
```

**Moltbot 执行**:

```
1. Agent 读取 fullstack-dev skill
   ↓
2. 理解完整流程（10 个步骤）
   ↓
3. 执行 Step 1: 记录计划到 AGENTS.md
   ↓
4. 执行 Step 2: sessions_spawn 创建 code-dev
   ↓
5. 执行 Step 3: sessions_send 发送任务
   "创建 Todo List 组件，支持添加、完成、删除，包含 unit test"
   ↓
6. 执行 Step 4: 轮询 sessions_history
   每 5 秒检查一次，直到完成
   ↓
7. 执行 Step 5: bash "npm test"
   如果失败 → sessions_send 通知修复 → 返回 Step 4
   ↓
8. 执行 Step 6: bash "npm run dev &"
   启动服务器并等待就绪
   ↓
9. 执行 Step 7: 浏览器 E2E 测试
   - browser_navigate
   - browser_type (添加任务)
   - browser_click (点击添加按钮)
   - browser_eval (验证任务已添加)
   - browser_click (完成任务)
   - browser_screenshot
   ↓
10. 执行 Step 8: pixelmatch 对比截图
    ↓
11. 执行 Step 9: write_file 生成报告
    ↓
12. 执行 Step 10: 清理资源
    ↓
13. 返回用户: "✅ Todo List 开发完成，所有测试通过！"
```

**关键点**:
- ❌ 没有写任何新代码
- ✅ 完全依赖现有工具
- ✅ Skill 只是教学文档

### 6.2 场景：仅用 Prompt 实现

**文件**: `~/clawd/AGENTS.md`

```markdown
# Project: Todo List Development

## When user asks to develop Todo List:

1. Create Code Agent
2. Send task: "Build React Todo List with add/complete/delete"
3. Wait for completion (poll sessions_history)
4. Run tests: `npm test`
5. Start server: `npm run dev &`
6. Test in browser:
   - Navigate to localhost:3000
   - Type "Buy milk" into input
   - Click "Add" button
   - Verify task appears
   - Click checkbox to complete
   - Verify strikethrough style
   - Click delete button
   - Verify task removed
7. Generate report
8. Cleanup

## Execute immediately when user mentions "Todo List"
```

**用户输入**:
```
开发一个 Todo List
```

**Moltbot 读取 AGENTS.md 后**:
```
Agent 思考:
"用户提到 'Todo List'，我看到 AGENTS.md 中有详细流程，
 我应该立即执行这 8 个步骤..."

[自动执行完整流程]
```

---

## 7. 限制与挑战

### 7.1 复杂逻辑的局限

**问题**: Skill/Prompt 难以表达复杂的条件逻辑

**示例**:
```javascript
// 这种逻辑用 prompt 很难表达
if (testFailed) {
  if (isUIssue) {
    notifyCodeAgent()
    retryAfter(fixApplied)
  } else if (isServerIssue) {
    restartServer()
    retryAfter(5000)
  } else {
    askUserForHelp()
  }
}
```

**解决方案**:
- 简化逻辑（只处理主要分支）
- 或者创建辅助工具（但这就需要写代码了）

### 7.2 循环与重试

**问题**: 纯 prompt 难以表达循环

**示例**:
```
监控 Code Agent，每 5 秒检查一次，最多检查 60 次
```

**在 Skill 中表达**:
```markdown
## Monitor Progress

Check every 5 seconds, up to 60 times (5 minutes total):

1. Call sessions_history
2. Check if complete
3. If not, wait 5 seconds and repeat
4. If 60 checks passed, report timeout
```

**Agent 解释**:
```
Agent 读到这段后会执行:

sessions_history(...)
[结果: 未完成]

等待 5 秒...

sessions_history(...)
[结果: 未完成]

...（重复 60 次）
```

**挑战**:
- Agent 可能"遗忘"计数
- 可能提前退出循环
- Token 消耗随次数线性增长

### 7.3 状态管理

**问题**: Agent 难以维护复杂状态

**示例**:
```javascript
const state = {
  codeAgentReady: false,
  unitTestsPassed: false,
  serverStarted: false,
  e2eTestsRun: 0,
  failures: []
}
```

**解决方案**:
- 使用 AGENTS.md 作为"外部内存"
- 每一步都记录状态

```markdown
## Current Status
- [x] Code Agent created
- [x] Unit tests passed
- [x] Server started
- [ ] E2E tests (2/5 completed)
```

Agent 读取 AGENTS.md 来"回忆"当前状态。

### 7.4 Token 消耗

**问题**: 反复发送相同的 prompt 浪费 tokens

**场景**:
```
轮询 60 次，每次都要读取完整的 skill...

Skill 大小: 5KB
轮询次数: 60
总消耗: 5KB × 60 = 300KB prompt tokens
```

**解决方案**:
- 缓存机制（Moltbot 已有 session snapshot）
- 简化 Skill（只保留核心步骤）

---

## 8. 最佳实践

### 8.1 设计 Skill 的原则

**1. 明确性**
```markdown
❌ 不好的表达:
"监控 Code Agent 进度"

✅ 好的表达:
"每 5 秒调用一次 sessions_history，检查最后一条消息是否包含 '完成'，
 最多重试 60 次（5 分钟），如果超时则报告错误"
```

**2. 结构化**
```markdown
## Step 1: Create Agent

Tool: sessions_spawn
Parameters:
- agentId: "code-dev"
- model: "anthropic/claude-sonnet-4-5"
- tools: ["read_file", "write_file", ...]

Expected outcome: Agent created successfully
Next step: Go to Step 2

## Step 2: Send Task
...
```

**3. 包含示例**
```markdown
## Example: Add Task Test

\```javascript
// Step 1: Type task name
browser_type({
  selector: "#new-task-input",
  text: "Buy groceries"
})

// Step 2: Click add button
browser_click({
  selector: "#add-task-button"
})

// Step 3: Verify task added
const tasks = browser_eval({
  script: "Array.from(document.querySelectorAll('.task-item')).map(el => el.textContent)"
})

// Step 4: Assert
if (!tasks.includes("Buy groceries")) {
  throw new Error("Task not added")
}
\```
```

### 8.2 Prompt 工程技巧

**1. 使用标记强调关键步骤**
```markdown
**CRITICAL**: Always clean up resources before finishing:
- Kill dev server
- Close browser
- Remove temp files
```

**2. 提供默认值**
```markdown
## Timeout Settings

- Server startup: 30 seconds (default)
- Browser action: 10 seconds (default)
- Test suite: 5 minutes (default)

Override by setting in config:
\```json
{
  "timeouts": {
    "server": 60000,
    "browser": 20000
  }
}
\```
```

**3. 错误处理模板**
```markdown
## If Test Fails

1. Take screenshot: `browser_screenshot({ path: "error.png" })`
2. Capture DOM: `browser_eval({ script: "document.documentElement.outerHTML" })`
3. Format error report:
   \```
   Test: {test-name}
   Failed at: {step}
   Error: {error-message}
   Screenshot: error.png
   DOM: error.html
   \```
4. Send to Code Agent: `sessions_send({ message: error-report })`
5. Wait for fix: Monitor sessions_history
6. Retry test
```

### 8.3 调试技巧

**1. 详细日志**
```markdown
## Logging

Record each major action to AGENTS.md:

\```javascript
write_file({
  path: "AGENTS.md",
  content: "\n[${timestamp}] Step 3: Sent task to Code Agent",
  mode: "append"
})
\```

This creates an audit trail for debugging.
```

**2. 截图每一步**
```markdown
## Screenshot Strategy

Take screenshots at key points:
1. Initial page load
2. Before each interaction
3. After each interaction
4. On error

File naming: `{step}-{action}-{timestamp}.png`

Example:
- 01-initial-20260129-1430.png
- 02-before-click-20260129-1431.png
- 03-after-click-20260129-1431.png
```

---

## 9. 何时需要写代码？

虽然理论上可以纯 Skill/Prompt 实现，但以下场景**建议写代码**：

### 9.1 复杂状态机

**场景**: 需要管理复杂的状态转换

```javascript
// 这种状态机用 prompt 很难维护
const stateMachine = {
  IDLE: ["DEVELOPING"],
  DEVELOPING: ["UNIT_TESTING", "ERROR"],
  UNIT_TESTING: ["E2E_TESTING", "FIXING", "ERROR"],
  E2E_TESTING: ["VISUAL_REGRESSION", "FIXING", "ERROR"],
  VISUAL_REGRESSION: ["REPORTING", "FIXING"],
  FIXING: ["UNIT_TESTING"],
  REPORTING: ["COMPLETE"],
  ERROR: ["IDLE"],
  COMPLETE: []
}
```

### 9.2 性能关键路径

**场景**: 需要高性能的数据处理

```javascript
// 分析 10MB 的测试输出
// 纯 prompt 让 Agent 处理会很慢
function parseTestOutput(output) {
  const failures = []
  const lines = output.split('\n')

  for (const line of lines) {
    if (line.includes('FAIL')) {
      // 复杂的正则匹配和解析
      failures.push(parseFailure(line))
    }
  }

  return failures
}
```

### 9.3 可靠性要求高

**场景**: 不能容忍 Agent "遗忘"或跳过步骤

```javascript
// 金融系统测试，必须严格按顺序执行
// 不能依赖 Agent 的"理解"
const criticalTests = [
  testLogin,
  testAuthorization,
  testTransaction,
  testAuditLog
]

for (const test of criticalTests) {
  const result = await test()
  if (!result.passed) {
    throw new Error("Critical test failed")
  }
}
```

### 9.4 团队协作

**场景**: 多人使用，需要标准化

**问题**:
- 每个人写的 prompt 风格不同
- 难以维护一致性

**解决**:
- 写代码封装标准流程
- 提供 CLI 工具

---

## 10. 终极答案

### 10.1 理论上可行吗？

**✅ 是的！**

**原因**:
1. Moltbot 已有所有必需工具
2. Skill 可以教会 Agent 组合使用工具
3. Prompt 可以指导执行流程

### 10.2 实际上推荐吗？

**看情况！**

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| **快速原型** | ✅ Skill/Prompt | 快速迭代，无需编码 |
| **学习实验** | ✅ Skill/Prompt | 理解工作流程 |
| **通用流程** | ✅ Skill | 可复用，易分享 |
| **项目特定** | ✅ Prompt (AGENTS.md) | 灵活，易修改 |
| **生产环境** | ⚠️ 代码 + Skill | 可靠性更高 |
| **团队协作** | ⚠️ 代码 + Skill | 标准化，易维护 |
| **复杂逻辑** | ❌ 写代码 | Prompt 难以表达 |

### 10.3 最佳实践

**组合方案**: 代码 + Skill + Prompt

```
┌─────────────────────────────────────────┐
│ Layer 1: 核心功能（代码）              │
│  - 复杂状态管理                        │
│  - 性能关键逻辑                        │
│  - 可靠性保证                          │
├─────────────────────────────────────────┤
│ Layer 2: 通用流程（Skill）             │
│  - Full-Stack Dev Orchestrator         │
│  - E2E Test Runner                     │
│  - Visual Regression Testing           │
├─────────────────────────────────────────┤
│ Layer 3: 项目定制（Prompt/AGENTS.md）  │
│  - 项目特定测试策略                    │
│  - 公司开发规范                        │
│  - 一次性任务流程                      │
└─────────────────────────────────────────┘
```

**示例**:
```markdown
# AGENTS.md

## Project Guidelines

使用 fullstack-dev skill 开发所有前端功能，
但遵循以下项目特定规则：

1. 使用公司 UI 组件库
2. 测试覆盖率必须 > 90%
3. E2E 测试包含 Chrome + Firefox
4. 截图对比阈值: 0.05 (更严格)
```

---

## 11. 总结

### 11.1 核心发现

**可以用 Skill + Prompt 实现！**

**理由**:
1. ✅ 所有工具已存在
2. ✅ Skill 可以教学
3. ✅ Agent 可以执行
4. ✅ 已在其他场景验证

**但有限制**:
1. ⚠️ 复杂逻辑表达困难
2. ⚠️ 状态管理依赖"记忆"
3. ⚠️ Token 消耗较高
4. ⚠️ 可靠性不如代码

### 11.2 实施建议

**阶段 1: 原型验证（纯 Skill/Prompt）**
- 写一个完整的 fullstack-dev skill
- 测试基本流程是否可行
- 收集痛点和改进点

**阶段 2: 优化迭代（Skill + 部分代码）**
- 将稳定的流程保留为 Skill
- 将复杂逻辑封装为工具
- 保持灵活性

**阶段 3: 生产化（代码 + Skill）**
- 核心功能用代码保证可靠性
- Skill 作为扩展和定制机制
- 文档和培训材料

### 11.3 价值评估

**投入**: 2-4 小时写 Skill 文档
**产出**: 完整的开发测试自动化流程
**ROI**: 极高（无需编码）

**适用于**:
- 个人项目
- 快速原型
- 学习实验
- 流程探索

**不适用于**:
- 关键业务系统
- 大规模团队
- 高性能要求
- 严格可靠性要求

---

**文档完成** ✨
