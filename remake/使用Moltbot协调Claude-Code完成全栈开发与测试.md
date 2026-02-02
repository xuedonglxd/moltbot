# 使用 Moltbot 协调 Claude Code 完成全栈开发与测试

> **版本**: v1.0
> **创建时间**: 2026-01-29
> **场景**: VS Code 插件、WebView 页面等前端应用的完整开发测试流程

---

## 1. 问题分析

### 1.1 Claude Code 的局限性

当使用 Claude Code 开发前端应用时，存在以下局限：

```
┌─────────────────────────────────────────────┐
│ Claude Code 可以做的                        │
├─────────────────────────────────────────────┤
│ ✅ 编写源代码（HTML/CSS/JS/TS）             │
│ ✅ 编写 Unit Test（Jest/Vitest）            │
│ ✅ 运行测试命令（npm test）                 │
│ ✅ 分析测试输出                              │
│ ✅ 修复代码 bug                              │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Claude Code 无法做的                        │
├─────────────────────────────────────────────┤
│ ❌ 启动浏览器查看页面                        │
│ ❌ 与 UI 交互（点击、输入、滚动）            │
│ ❌ 验证视觉效果（颜色、布局、动画）          │
│ ❌ 进行端到端测试（E2E）                     │
│ ❌ 截图对比（视觉回归测试）                  │
│ ❌ 验证跨浏览器兼容性                        │
└─────────────────────────────────────────────┘
```

**具体场景示例**:

```javascript
// Claude Code 可以写这个测试
test('Button component renders correctly', () => {
  const button = render(<Button>Click me</Button>);
  expect(button.getByText('Click me')).toBeInTheDocument();
});

// 但无法验证这些问题：
// ❌ 按钮的颜色是否正确？
// ❌ 点击后动画是否流畅？
// ❌ 在 Chrome/Firefox/Safari 中是否一致？
// ❌ 响应式布局是否正常？
```

### 1.2 Moltbot 的能力补充

Moltbot 拥有 Claude Code 缺少的关键能力：

```
┌─────────────────────────────────────────────┐
│ Moltbot 独有能力                            │
├─────────────────────────────────────────────┤
│ ✅ Browser 工具（Playwright/CDP）           │
│    - 启动浏览器                              │
│    - 导航到页面                              │
│    - 执行 JS 脚本                            │
│    - 截图/录屏                               │
│                                              │
│ ✅ Sessions 工具（多 Agent 协调）            │
│    - sessions_spawn：创建子 Agent           │
│    - sessions_send：发送任务                │
│    - sessions_history：获取结果             │
│                                              │
│ ✅ 长期记忆（AGENTS.md）                     │
│    - 记录测试基准                            │
│    - 跟踪项目状态                            │
│                                              │
│ ✅ Skill 系统                                │
│    - 自定义测试流程                          │
│    - 封装复杂工具链                          │
└─────────────────────────────────────────────┘
```

---

## 2. 解决方案架构

### 2.1 整体架构

```
┌────────────────────────────────────────────────────────┐
│                  Moltbot (协调者)                      │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Master Agent                                 │    │
│  │  - 接收用户需求                               │    │
│  │  - 制定开发测试计划                           │    │
│  │  - 协调子 Agent                               │    │
│  │  - 汇总结果                                   │    │
│  └──────────────┬───────────────────────────────┘    │
│                 │                                      │
│        ┌────────┼────────┐                            │
│        │        │        │                            │
│        ▼        ▼        ▼                            │
│   ┌────────┐ ┌────────┐ ┌────────┐                   │
│   │ Code   │ │Browser │ │Test    │                   │
│   │ Agent  │ │Tool    │ │Runner  │                   │
│   └────────┘ └────────┘ └────────┘                   │
│      │          │          │                          │
└──────┼──────────┼──────────┼──────────────────────────┘
       │          │          │
       ▼          ▼          ▼
   编写代码    浏览器交互   运行测试
```

### 2.2 Agent 分工

#### 2.2.1 Master Agent（Moltbot）

**职责**:
- 总体协调
- 任务分解
- 结果验证
- 问题诊断

**工具集**:
- `sessions_spawn`: 创建 Code Agent
- `sessions_send`: 发送任务
- `sessions_history`: 获取进度
- `browser_*`: 浏览器操作
- `bash`: 运行命令

#### 2.2.2 Code Agent（基于 Claude Code）

**职责**:
- 编写源代码
- 编写 Unit Test
- 代码重构
- Bug 修复

**工具集**:
- Read, Edit, Write: 文件操作
- Glob, Grep: 代码搜索
- Bash: 运行测试

**创建方式**:
```json
{
  "method": "sessions_spawn",
  "params": {
    "agentId": "code-dev",
    "instructions": "你是一个前端开发专家，负责编写代码和单元测试",
    "tools": ["read", "write", "edit", "bash", "glob", "grep"]
  }
}
```

#### 2.2.3 Browser Tool（Moltbot 内置）

**职责**:
- 启动浏览器
- 页面导航
- UI 交互
- 截图验证

**已有能力**:
```typescript
// Moltbot 已有的 browser 工具
browser_navigate({ url: "http://localhost:3000" })
browser_click({ selector: "#submit-button" })
browser_type({ selector: "#username", text: "test" })
browser_screenshot({ path: "screenshot.png" })
browser_eval({ script: "document.title" })
```

---

## 3. 完整工作流程

### 3.1 端到端开发测试流程

```
用户需求
   │
   ▼
[1] Moltbot 分析需求
   │
   ├─ 拆分为子任务
   ├─ 制定测试策略
   └─ 记录到 AGENTS.md
   │
   ▼
[2] 创建 Code Agent
   │
   └─ sessions_spawn(agentId: "code-dev")
   │
   ▼
[3] Code Agent 开发
   │
   ├─ 编写源代码
   ├─ 编写 Unit Test
   └─ 返回结果
   │
   ▼
[4] Master 运行 Unit Test
   │
   ├─ bash: npm test
   │
   ├─ 如果失败 ❌
   │   ├─ 分析错误
   │   └─ sessions_send(code-dev, "修复测试失败")
   │       └─ 返回 [3]
   │
   └─ 如果成功 ✅
       └─ 继续
   │
   ▼
[5] Master 构建应用
   │
   └─ bash: npm run build
   │
   ▼
[6] Master 启动开发服务器
   │
   └─ bash: npm run dev &
   │
   ▼
[7] Master 执行浏览器测试
   │
   ├─ browser_navigate({ url: "http://localhost:3000" })
   ├─ 等待页面加载
   ├─ browser_screenshot({ path: "baseline.png" })
   │
   ├─ 执行交互测试
   │   ├─ browser_click({ selector: "#button" })
   │   ├─ 验证响应
   │   └─ browser_screenshot({ path: "after-click.png" })
   │
   └─ 记录结果
   │
   ▼
[8] Master 分析测试结果
   │
   ├─ 如果失败 ❌
   │   ├─ 截图对比
   │   ├─ 分析失败原因
   │   ├─ sessions_send(code-dev, "修复 E2E 测试失败")
   │   └─ 返回 [3]
   │
   └─ 如果成功 ✅
       └─ 继续
   │
   ▼
[9] Master 生成报告
   │
   ├─ 代码统计
   ├─ 测试覆盖率
   ├─ 截图对比
   └─ 返回用户
```

### 3.2 示例：开发一个 Todo List WebView

**用户输入**:
```
帮我开发一个 Todo List WebView，包括：
1. 添加任务功能
2. 完成任务功能
3. 删除任务功能
要求包含 unit test 和 E2E test
```

**Moltbot 执行流程**:

```javascript
// [1] 分析需求并记录计划
write_file({
  path: "AGENTS.md",
  content: `
## Current Project: Todo List WebView

### Requirements
- Add task
- Complete task
- Delete task
- Unit tests
- E2E tests

### Plan
1. Create Code Agent for development
2. Implement components and unit tests
3. Run browser E2E tests
4. Fix issues and iterate

### Testing Strategy
- Unit: Jest + React Testing Library
- E2E: Browser automation via Moltbot
- Visual: Screenshot comparison
  `
});

// [2] 创建 Code Agent
sessions_spawn({
  agentId: "todo-dev",
  model: "claude-sonnet-4-5",
  instructions: `
You are a frontend developer.
Focus on writing clean, tested code.
Use React + TypeScript.
  `,
  tools: ["read", "write", "edit", "bash", "glob", "grep"]
});

// [3] 发送开发任务
sessions_send({
  targetSessionKey: "agent:main:todo-dev",
  message: `
Create a Todo List app with:
- src/TodoList.tsx: main component
- src/TodoList.test.tsx: unit tests
- public/index.html: entry point

Use React hooks and TypeScript.
Write comprehensive unit tests.
  `
});

// [4] 等待 Code Agent 完成
// ... (通过 sessions_history 轮询状态)

// [5] 运行 Unit Test
bash({
  command: "cd todo-app && npm test",
  description: "Run unit tests"
});

// 假设测试通过 ✅

// [6] 启动开发服务器
bash({
  command: "cd todo-app && npm run dev &",
  description: "Start dev server in background"
});

// 等待服务器启动
bash({
  command: "sleep 3 && curl http://localhost:3000",
  description: "Wait for server and check"
});

// [7] 执行浏览器测试
browser_navigate({
  url: "http://localhost:3000"
});

// 截取初始状态
browser_screenshot({
  path: "screenshots/todo-initial.png"
});

// 测试：添加任务
browser_type({
  selector: "#new-task-input",
  text: "Buy groceries"
});

browser_click({
  selector: "#add-task-button"
});

// 验证任务已添加
const tasks = browser_eval({
  script: `
    Array.from(document.querySelectorAll('.task-item'))
      .map(el => el.textContent)
  `
});

// 断言
if (!tasks.includes("Buy groceries")) {
  // 测试失败，通知 Code Agent
  sessions_send({
    targetSessionKey: "agent:main:todo-dev",
    message: `
E2E test failed: Task not added to list.
Expected: "Buy groceries" in task list
Actual: ${JSON.stringify(tasks)}

Please check:
1. Event handler for add button
2. State update logic
3. DOM rendering
    `
  });
  // 返回重新开发
}

// 测试：完成任务
browser_click({
  selector: ".task-item:first-child .complete-checkbox"
});

browser_screenshot({
  path: "screenshots/todo-completed.png"
});

// 验证样式变化
const isCompleted = browser_eval({
  script: `
    document.querySelector('.task-item:first-child')
      .classList.contains('completed')
  `
});

// ... 更多测试

// [8] 所有测试通过，生成报告
write_file({
  path: "test-report.md",
  content: `
# Todo List Test Report

## Unit Tests
✅ All 12 tests passed
- TodoList component rendering: 3/3
- Add task functionality: 3/3
- Complete task functionality: 3/3
- Delete task functionality: 3/3

## E2E Tests
✅ All scenarios passed
- Add task: ✅
- Complete task: ✅
- Delete task: ✅

## Screenshots
- Initial state: screenshots/todo-initial.png
- After adding task: screenshots/todo-with-task.png
- After completing task: screenshots/todo-completed.png

## Coverage
- Lines: 95%
- Branches: 90%
- Functions: 100%
  `
});

// 发送报告给用户
message_send({
  message: "Todo List 开发完成！所有测试通过。\n\n" +
           read_file({ path: "test-report.md" })
});
```

---

## 4. 需要补足的工具与 Skill

### 4.1 核心 Skill 需求

#### Skill 1: Claude Code Integration

**文件**: `~/clawd/skills/claude-code/SKILL.md`

```markdown
---
name: claude-code
description: Integrate with Claude Code CLI for development tasks
metadata: {"moltbot":{"emoji":"👨‍💻","requires":{"bins":["claude-code"]}}}
---

# Claude Code Integration

Use this skill to invoke Claude Code for coding tasks.

## Usage

### Direct CLI Call
\```bash
claude-code "Add a login form component"
\```

### Via Session Spawn
Use `sessions_spawn` to create a dedicated Code Agent:

\```json
{
  "agentId": "code-dev",
  "model": "claude-sonnet-4-5",
  "tools": ["read", "write", "edit", "bash", "glob", "grep"]
}
\```

## Best Practices

1. Use Code Agent for pure development work
2. Master Agent handles coordination and E2E testing
3. Pass clear, specific instructions
4. Monitor progress via `sessions_history`
```

#### Skill 2: E2E Test Runner

**文件**: `~/clawd/skills/e2e-test/SKILL.md`

```markdown
---
name: e2e-test
description: End-to-end testing framework using browser automation
metadata: {"moltbot":{"emoji":"🧪"}}
---

# E2E Test Runner

Run end-to-end tests with browser automation.

## Test Structure

\```javascript
const test = {
  name: "User can add a task",
  steps: [
    { action: "navigate", url: "http://localhost:3000" },
    { action: "type", selector: "#input", text: "New task" },
    { action: "click", selector: "#add-button" },
    { action: "assert", script: "tasks.length === 1" }
  ]
};
\```

## Execution

Use Moltbot's `browser_*` tools to execute steps:

\```javascript
for (const step of test.steps) {
  switch (step.action) {
    case "navigate":
      browser_navigate({ url: step.url });
      break;
    case "click":
      browser_click({ selector: step.selector });
      break;
    // ...
  }
}
\```
```

#### Skill 3: Visual Regression Testing

**文件**: `~/clawd/skills/visual-regression/SKILL.md`

```markdown
---
name: visual-regression
description: Compare screenshots for visual regression testing
metadata: {"moltbot":{"emoji":"📸","requires":{"bins":["pixelmatch"]},"install":[{"id":"node","kind":"node","package":"pixelmatch","bins":["pixelmatch"],"label":"Install pixelmatch (npm)"}]}}
---

# Visual Regression Testing

Compare screenshots to detect visual changes.

## Installation

\```bash
npm install -g pixelmatch
\```

## Usage

### 1. Capture baseline
\```javascript
browser_screenshot({ path: "baseline.png" });
\```

### 2. Capture current
\```javascript
browser_screenshot({ path: "current.png" });
\```

### 3. Compare
\```bash
pixelmatch baseline.png current.png diff.png 0.1
\```

## Workflow

1. First run: save as baseline
2. Subsequent runs: compare with baseline
3. If difference > threshold: test fails
4. Manual review: update baseline if change is intentional
```

#### Skill 4: VS Code Extension Helper

**文件**: `~/clawd/skills/vscode-extension/SKILL.md`

```markdown
---
name: vscode-extension
description: Build, install, and test VS Code extensions
metadata: {"moltbot":{"emoji":"🔧","requires":{"bins":["vsce"]}}}
---

# VS Code Extension Helper

Manage VS Code extension development lifecycle.

## Build Extension

\```bash
vsce package
\```

## Install Extension

\```bash
code --install-extension my-extension-0.0.1.vsix
\```

## Test Extension

### Unit Tests
\```bash
npm run test
\```

### E2E Tests (via UI automation)
\```javascript
// 1. Launch VS Code
bash({ command: "code --new-window test-workspace" });

// 2. Open command palette (Cmd+Shift+P)
browser_keyboard({ keys: ["Meta", "Shift", "p"] });

// 3. Run extension command
browser_type({ selector: ".quick-input", text: "My Extension: Command" });
browser_keyboard({ keys: ["Enter"] });

// 4. Verify result
browser_screenshot({ path: "extension-result.png" });
\```
```

### 4.2 辅助 Skill

#### Skill 5: Dev Server Manager

```markdown
---
name: dev-server
description: Manage development servers (start/stop/status)
---

# Dev Server Manager

## Start Server

\```bash
# Start in background
npm run dev > server.log 2>&1 &
echo $! > .dev-server.pid
\```

## Check Status

\```bash
if lsof -i :3000 > /dev/null; then
  echo "Server running"
else
  echo "Server not running"
fi
\```

## Stop Server

\```bash
if [ -f .dev-server.pid ]; then
  kill $(cat .dev-server.pid)
  rm .dev-server.pid
fi
\```
```

#### Skill 6: Test Report Generator

```markdown
---
name: test-report
description: Generate comprehensive test reports with screenshots
---

# Test Report Generator

## Generate Report

\```javascript
const report = {
  project: "Todo App",
  timestamp: new Date().toISOString(),
  unitTests: {
    total: 12,
    passed: 12,
    failed: 0
  },
  e2eTests: {
    total: 5,
    passed: 5,
    failed: 0
  },
  screenshots: [
    "screenshots/initial.png",
    "screenshots/after-add.png"
  ]
};

write_file({
  path: "test-report.json",
  content: JSON.stringify(report, null, 2)
});
\```

## Markdown Report

\```markdown
# Test Report: {{project}}

Generated: {{timestamp}}

## Summary
- ✅ Unit Tests: {{unitTests.passed}}/{{unitTests.total}}
- ✅ E2E Tests: {{e2eTests.passed}}/{{e2eTests.total}}

## Screenshots
{{#each screenshots}}
![]({{this}})
{{/each}}
\```
```

---

## 5. 配置 Moltbot

### 5.1 启用必需工具

**`~/.clawdbot/moltbot.json`**:

```json5
{
  "agent": {
    "model": "anthropic/claude-sonnet-4-5",
    "workspace": "~/clawd"
  },

  // 启用浏览器工具
  "browser": {
    "enabled": true,
    "headless": false,  // 开发时用 false，CI 时用 true
    "viewport": {
      "width": 1280,
      "height": 720
    }
  },

  // 工具权限
  "tools": {
    "policy": {
      "default": "allow",
      "allowlist": [
        "bash",
        "read_file",
        "write_file",
        "edit_file",
        "browser_navigate",
        "browser_click",
        "browser_type",
        "browser_screenshot",
        "browser_eval",
        "sessions_spawn",
        "sessions_send",
        "sessions_history"
      ]
    }
  },

  // Skills 配置
  "skills": {
    "entries": {
      "claude-code": { "enabled": true },
      "e2e-test": { "enabled": true },
      "visual-regression": { "enabled": true },
      "vscode-extension": { "enabled": true }
    }
  }
}
```

### 5.2 配置子 Agent 模板

**`~/clawd/agent-templates/code-dev.json`**:

```json5
{
  "name": "Code Developer",
  "model": "anthropic/claude-sonnet-4-5",
  "instructions": `
You are a frontend developer specializing in React and TypeScript.

## Your Responsibilities
- Write clean, maintainable code
- Follow best practices and design patterns
- Write comprehensive unit tests
- Fix bugs quickly and efficiently

## Your Tools
- read_file, write_file, edit_file: File operations
- glob, grep: Code search
- bash: Run tests and build commands

## Guidelines
- Always write tests alongside code
- Use TypeScript strict mode
- Follow the project's ESLint config
- Keep functions small and focused
  `,
  "tools": [
    "read_file",
    "write_file",
    "edit_file",
    "glob",
    "grep",
    "bash"
  ],
  "workspace": "~/clawd/dev-projects"
}
```

---

## 6. 实战示例

### 6.1 完整示例：开发并测试一个 WebView 计算器

**用户需求**:
```
帮我开发一个计算器 WebView，要求：
1. 支持加减乘除
2. 有清空功能
3. 响应式设计
4. 包含完整测试
```

**Moltbot 执行步骤**:

#### Step 1: 创建项目结构

```javascript
// Master Agent 执行
bash({
  command: `
    mkdir -p calculator-app/{src,tests,screenshots}
    cd calculator-app
    npm init -y
    npm install react react-dom typescript @types/react
    npm install -D jest @testing-library/react vite
  `,
  description: "Initialize project structure"
});
```

#### Step 2: 创建 Code Agent

```javascript
sessions_spawn({
  agentId: "calc-dev",
  model: "anthropic/claude-sonnet-4-5",
  instructions: `
Create a calculator app with:
- Clean UI with number buttons (0-9)
- Operation buttons (+, -, *, /)
- Display for results
- Clear button (C)
- Responsive design

Tech stack:
- React + TypeScript
- Vite for bundling
- Jest for testing
  `,
  tools: ["read_file", "write_file", "edit_file", "bash", "glob", "grep"],
  workspace: "~/clawd/dev-projects/calculator-app"
});
```

#### Step 3: 监控开发进度

```javascript
// 轮询检查进度
const checkProgress = async () => {
  const history = await sessions_history({
    sessionKey: "agent:main:calc-dev",
    limit: 10
  });

  // 检查是否完成
  const lastMessage = history[history.length - 1];
  if (lastMessage.role === "assistant" &&
      lastMessage.content.includes("开发完成")) {
    return true;
  }

  return false;
};

while (!await checkProgress()) {
  await sleep(5000);  // 每 5 秒检查一次
}
```

#### Step 4: 运行 Unit Tests

```javascript
const testResult = bash({
  command: "cd calculator-app && npm test",
  description: "Run unit tests"
});

if (testResult.exitCode !== 0) {
  // 测试失败，发送错误信息给 Code Agent
  sessions_send({
    targetSessionKey: "agent:main:calc-dev",
    message: `
Unit tests failed:

${testResult.stderr}

Please fix the failing tests.
    `
  });

  // 等待修复
  while (!await checkProgress()) {
    await sleep(5000);
  }

  // 重新运行测试
  // ...（递归）
}

// 测试通过，记录到内存
write_file({
  path: "AGENTS.md",
  content: `
## Calculator Project

### Status
- ✅ Code completed
- ✅ Unit tests passed (12/12)

### Next Steps
- E2E testing
  `,
  mode: "append"
});
```

#### Step 5: 启动开发服务器

```javascript
bash({
  command: `
    cd calculator-app
    npm run dev > ../dev-server.log 2>&1 &
    echo $! > ../dev-server.pid
  `,
  description: "Start dev server"
});

// 等待服务器就绪
let serverReady = false;
for (let i = 0; i < 10; i++) {
  const check = bash({
    command: "curl -s http://localhost:5173 > /dev/null && echo 'ready'",
    timeout: 2000
  });

  if (check.stdout.includes("ready")) {
    serverReady = true;
    break;
  }

  await sleep(1000);
}

if (!serverReady) {
  throw new Error("Dev server failed to start");
}
```

#### Step 6: 执行浏览器 E2E 测试

```javascript
// 初始化浏览器
browser_navigate({ url: "http://localhost:5173" });

// 截取初始状态
browser_screenshot({ path: "calculator-app/screenshots/initial.png" });

// 测试场景 1: 基本加法 (2 + 3 = 5)
const testAddition = async () => {
  // 点击 2
  await browser_click({ selector: 'button[data-value="2"]' });

  // 点击 +
  await browser_click({ selector: 'button[data-op="add"]' });

  // 点击 3
  await browser_click({ selector: 'button[data-value="3"]' });

  // 点击 =
  await browser_click({ selector: 'button[data-op="equals"]' });

  // 截图
  await browser_screenshot({
    path: "calculator-app/screenshots/addition.png"
  });

  // 验证结果
  const display = await browser_eval({
    script: 'document.querySelector(".display").textContent'
  });

  if (display !== "5") {
    return {
      passed: false,
      expected: "5",
      actual: display,
      screenshot: "calculator-app/screenshots/addition.png"
    };
  }

  return { passed: true };
};

// 测试场景 2: 乘法 (7 * 8 = 56)
const testMultiplication = async () => {
  // 先清空
  await browser_click({ selector: 'button[data-op="clear"]' });

  await browser_click({ selector: 'button[data-value="7"]' });
  await browser_click({ selector: 'button[data-op="multiply"]' });
  await browser_click({ selector: 'button[data-value="8"]' });
  await browser_click({ selector: 'button[data-op="equals"]' });

  const display = await browser_eval({
    script: 'document.querySelector(".display").textContent'
  });

  await browser_screenshot({
    path: "calculator-app/screenshots/multiplication.png"
  });

  return {
    passed: display === "56",
    expected: "56",
    actual: display
  };
};

// 测试场景 3: 清空功能
const testClear = async () => {
  await browser_click({ selector: 'button[data-op="clear"]' });

  const display = await browser_eval({
    script: 'document.querySelector(".display").textContent'
  });

  return {
    passed: display === "0",
    expected: "0",
    actual: display
  };
};

// 执行所有测试
const e2eResults = {
  addition: await testAddition(),
  multiplication: await testMultiplication(),
  clear: await testClear()
};

// 检查是否有失败
const failures = Object.entries(e2eResults)
  .filter(([_, result]) => !result.passed);

if (failures.length > 0) {
  // 有测试失败，通知 Code Agent
  const failureReport = failures.map(([name, result]) => {
    return `
Test: ${name}
Expected: ${result.expected}
Actual: ${result.actual}
Screenshot: ${result.screenshot || 'N/A'}
    `;
  }).join('\n---\n');

  sessions_send({
    targetSessionKey: "agent:main:calc-dev",
    message: `
E2E tests failed:

${failureReport}

Please investigate and fix the issues.
    `
  });

  // 等待修复并重新测试
  // ...
}
```

#### Step 7: 视觉回归测试

```javascript
// 检查是否有基准截图
const hasBaseline = bash({
  command: "test -f calculator-app/screenshots/baseline.png && echo 'yes'",
  timeout: 1000
});

if (!hasBaseline.stdout.includes("yes")) {
  // 首次运行，保存为基准
  bash({
    command: `
      cp calculator-app/screenshots/initial.png \
         calculator-app/screenshots/baseline.png
    `
  });

  write_file({
    path: "AGENTS.md",
    content: "\n✅ Baseline screenshot saved",
    mode: "append"
  });
} else {
  // 对比当前截图与基准
  const compareResult = bash({
    command: `
      cd calculator-app/screenshots
      pixelmatch baseline.png initial.png diff.png 0.1
    `,
    description: "Compare screenshots"
  });

  if (compareResult.exitCode !== 0) {
    // 存在视觉差异
    write_file({
      path: "AGENTS.md",
      content: `
⚠️ Visual regression detected!
Diff image: calculator-app/screenshots/diff.png

Please review and decide:
1. If change is intentional, update baseline
2. If bug, notify Code Agent to fix
      `,
      mode: "append"
    });
  } else {
    write_file({
      path: "AGENTS.md",
      content: "\n✅ Visual regression test passed",
      mode: "append"
    });
  }
}
```

#### Step 8: 生成测试报告

```javascript
const report = {
  project: "Calculator WebView",
  timestamp: new Date().toISOString(),
  summary: {
    unitTests: {
      total: 12,
      passed: 12,
      failed: 0,
      coverage: "95%"
    },
    e2eTests: {
      total: 3,
      passed: 3,
      failed: 0
    },
    visualRegression: {
      baseline: "calculator-app/screenshots/baseline.png",
      current: "calculator-app/screenshots/initial.png",
      diff: "calculator-app/screenshots/diff.png",
      pixelsDifferent: 0,
      passed: true
    }
  },
  screenshots: [
    "calculator-app/screenshots/initial.png",
    "calculator-app/screenshots/addition.png",
    "calculator-app/screenshots/multiplication.png"
  ],
  recommendations: []
};

// 保存 JSON 报告
write_file({
  path: "calculator-app/test-report.json",
  content: JSON.stringify(report, null, 2)
});

// 生成 Markdown 报告
const markdown = `
# Calculator WebView - Test Report

**Generated**: ${report.timestamp}

## 📊 Summary

### Unit Tests
- ✅ Passed: ${report.summary.unitTests.passed}/${report.summary.unitTests.total}
- 📈 Coverage: ${report.summary.unitTests.coverage}

### E2E Tests
- ✅ Passed: ${report.summary.e2eTests.passed}/${report.summary.e2eTests.total}

### Visual Regression
- ${report.summary.visualRegression.passed ? '✅' : '❌'} Status: ${report.summary.visualRegression.passed ? 'PASSED' : 'FAILED'}
- 📸 Pixels Different: ${report.summary.visualRegression.pixelsDifferent}

## 📸 Screenshots

### Initial State
![Initial](${report.screenshots[0]})

### After Addition Test
![Addition](${report.screenshots[1]})

### After Multiplication Test
![Multiplication](${report.screenshots[2]})

## 🎯 Test Coverage

| Component | Lines | Branches | Functions |
|-----------|-------|----------|-----------|
| Calculator.tsx | 98% | 95% | 100% |
| Display.tsx | 100% | 100% | 100% |
| Button.tsx | 100% | 100% | 100% |

## ✅ Conclusion

All tests passed successfully! The calculator is ready for deployment.
`;

write_file({
  path: "calculator-app/test-report.md",
  content: markdown
});

// 发送报告给用户
message_send({
  message: `
计算器开发完成！✅

所有测试通过：
- Unit Tests: 12/12 ✅
- E2E Tests: 3/3 ✅
- Visual Regression: 通过 ✅

详细报告请查看：
calculator-app/test-report.md

截图已保存到：
calculator-app/screenshots/
  `
});
```

#### Step 9: 清理资源

```javascript
// 停止开发服务器
bash({
  command: `
    if [ -f dev-server.pid ]; then
      kill $(cat dev-server.pid)
      rm dev-server.pid
    fi
  `,
  description: "Stop dev server"
});

// 关闭浏览器
browser_close();

// 更新项目状态
write_file({
  path: "AGENTS.md",
  content: `
## Calculator Project - COMPLETED ✅

### Final Status
- Code: ✅ Completed
- Unit Tests: ✅ 12/12 passed
- E2E Tests: ✅ 3/3 passed
- Visual Regression: ✅ Passed
- Report: ✅ Generated

### Deliverables
- Source code: calculator-app/src/
- Tests: calculator-app/tests/
- Screenshots: calculator-app/screenshots/
- Report: calculator-app/test-report.md

### Metrics
- Development time: ~10 minutes
- Lines of code: 350
- Test coverage: 95%
  `,
  mode: "append"
});
```

---

## 7. 高级场景

### 7.1 跨浏览器测试

**需求**: 在 Chrome、Firefox、Safari 中测试

**实现**:

```javascript
const browsers = ["chromium", "firefox", "webkit"];
const results = {};

for (const browser of browsers) {
  // 启动指定浏览器
  browser_launch({ browserType: browser });

  browser_navigate({ url: "http://localhost:5173" });

  // 执行测试
  const testResult = await runE2ETests();

  // 截图
  browser_screenshot({
    path: `screenshots/${browser}-result.png`
  });

  results[browser] = testResult;

  browser_close();
}

// 汇总结果
const allPassed = Object.values(results).every(r => r.passed);

if (!allPassed) {
  // 分析跨浏览器差异
  const failures = Object.entries(results)
    .filter(([_, r]) => !r.passed);

  sessions_send({
    targetSessionKey: "agent:main:calc-dev",
    message: `
Cross-browser test failures:

${failures.map(([browser, result]) => `
Browser: ${browser}
Issue: ${result.error}
Screenshot: screenshots/${browser}-result.png
`).join('\n---\n')}

Please fix browser compatibility issues.
    `
  });
}
```

### 7.2 性能测试

**需求**: 测量页面加载时间和交互响应

**实现**:

```javascript
// 测量页面加载
browser_navigate({ url: "http://localhost:5173" });

const loadTime = browser_eval({
  script: `
    performance.getEntriesByType('navigation')[0].loadEventEnd -
    performance.getEntriesByType('navigation')[0].fetchStart
  `
});

// 测量按钮点击响应时间
const responseTime = browser_eval({
  script: `
    const startTime = performance.now();
    document.querySelector('button[data-value="1"]').click();
    const endTime = performance.now();
    endTime - startTime;
  `
});

// 记录性能指标
write_file({
  path: "calculator-app/performance.json",
  content: JSON.stringify({
    loadTime: Math.round(loadTime),
    responseTime: Math.round(responseTime),
    timestamp: new Date().toISOString()
  }, null, 2)
});

// 如果性能不达标，通知优化
if (loadTime > 2000 || responseTime > 100) {
  sessions_send({
    targetSessionKey: "agent:main:calc-dev",
    message: `
Performance issues detected:
- Page load time: ${Math.round(loadTime)}ms (target: <2000ms)
- Click response: ${Math.round(responseTime)}ms (target: <100ms)

Please optimize:
1. Bundle size
2. Lazy loading
3. Event handlers
    `
  });
}
```

### 7.3 可访问性测试

**需求**: 检查 ARIA 标签、键盘导航等

**实现**:

```javascript
// 检查 ARIA 标签
const ariaIssues = browser_eval({
  script: `
    const issues = [];

    // 检查按钮是否有 aria-label
    document.querySelectorAll('button').forEach(btn => {
      if (!btn.getAttribute('aria-label') && !btn.textContent.trim()) {
        issues.push({
          element: btn.outerHTML,
          issue: 'Missing aria-label'
        });
      }
    });

    // 检查显示区域是否有 role
    const display = document.querySelector('.display');
    if (display && !display.getAttribute('role')) {
      issues.push({
        element: display.outerHTML,
        issue: 'Missing role attribute'
      });
    }

    return issues;
  `
});

if (ariaIssues.length > 0) {
  sessions_send({
    targetSessionKey: "agent:main:calc-dev",
    message: `
Accessibility issues found:

${JSON.stringify(ariaIssues, null, 2)}

Please add proper ARIA attributes for screen readers.
    `
  });
}

// 测试键盘导航
browser_keyboard({ keys: ["Tab"] });
const focusedElement = browser_eval({
  script: 'document.activeElement.tagName'
});

if (focusedElement !== "BUTTON") {
  // 键盘导航有问题
  // ...
}
```

### 7.4 响应式测试

**需求**: 测试不同屏幕尺寸

**实现**:

```javascript
const viewports = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1920, height: 1080 }
];

for (const viewport of viewports) {
  browser_setViewport({
    width: viewport.width,
    height: viewport.height
  });

  browser_navigate({ url: "http://localhost:5173" });

  browser_screenshot({
    path: `screenshots/${viewport.name}.png`
  });

  // 检查布局是否正确
  const layoutIssues = browser_eval({
    script: `
      const issues = [];

      // 检查按钮是否可见
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          issues.push('Button hidden: ' + btn.textContent);
        }
      });

      // 检查是否有横向滚动
      if (document.body.scrollWidth > window.innerWidth) {
        issues.push('Horizontal scrollbar detected');
      }

      return issues;
    `
  });

  if (layoutIssues.length > 0) {
    sessions_send({
      targetSessionKey: "agent:main:calc-dev",
      message: `
Responsive design issues at ${viewport.name} (${viewport.width}x${viewport.height}):

${layoutIssues.join('\n')}

Please fix responsive layout.
      `
    });
  }
}
```

---

## 8. VS Code 插件特定场景

### 8.1 插件开发流程

```javascript
// 1. 创建插件项目
bash({
  command: `
    npx -y yo code my-extension
    cd my-extension
    npm install
  `
});

// 2. 开发插件（通过 Code Agent）
sessions_spawn({
  agentId: "vscode-dev",
  instructions: "Develop a VS Code extension that...",
  workspace: "~/clawd/dev-projects/my-extension"
});

// 3. 打包插件
bash({
  command: "cd my-extension && vsce package",
  description: "Package extension"
});

// 4. 安装插件
bash({
  command: "code --install-extension my-extension/my-extension-0.0.1.vsix",
  description: "Install extension"
});

// 5. 测试插件
// 启动 VS Code（通过 UI 自动化）
bash({
  command: "code --new-window test-workspace",
  description: "Launch VS Code"
});

// 等待 VS Code 启动
await sleep(2000);

// 使用 AppleScript 或 UI automation 测试
// （macOS 可使用 system.run 调用 osascript）
```

### 8.2 WebView 插件 E2E 测试

**场景**: 测试带 WebView 的 VS Code 插件

```javascript
// 1. 安装插件
bash({
  command: "code --install-extension my-webview-extension.vsix"
});

// 2. 启动 VS Code
bash({
  command: "code --new-window"
});

// 3. 激活插件命令（通过 keyboard shortcut）
// Cmd+Shift+P 打开命令面板
bash({
  command: `osascript -e 'tell application "System Events" to keystroke "p" using {command down, shift down}'`
});

await sleep(500);

// 4. 输入命令
bash({
  command: `osascript -e 'tell application "System Events" to keystroke "My Extension: Open WebView"'`
});

await sleep(200);

// 5. 按回车执行
bash({
  command: `osascript -e 'tell application "System Events" to keystroke return'`
});

// 6. 等待 WebView 打开
await sleep(1000);

// 7. 截图
bash({
  command: "screencapture -x screenshots/vscode-webview.png"
});

// 8. 使用 browser 工具连接到 WebView（如果可以获取 DevTools URL）
// 或使用 Accessibility API 进行 UI 验证
```

---

## 9. 最佳实践

### 9.1 设计原则

**1. 关注点分离**
```
Master Agent (Moltbot)
├─ 总体协调
├─ E2E 测试
└─ 结果汇总

Code Agent (Claude Code)
├─ 编写代码
├─ Unit 测试
└─ Bug 修复
```

**2. 明确的责任边界**
- Master 不写代码（除非简单脚本）
- Code Agent 不做浏览器测试
- 通过消息传递协调

**3. 可重复的流程**
- 将测试步骤封装为 skill
- 标准化测试报告格式
- 版本化基准数据

### 9.2 调试技巧

**1. 详细日志**
```javascript
write_file({
  path: "debug.log",
  content: `
[${new Date().toISOString()}] Starting E2E test
[${new Date().toISOString()}] Browser launched
[${new Date().toISOString()}] Navigated to ${url}
  `,
  mode: "append"
});
```

**2. 截图每一步**
```javascript
const steps = ["initial", "after-click", "after-input"];
for (const step of steps) {
  // ... 执行操作
  browser_screenshot({ path: `debug/${step}.png` });
}
```

**3. 保存 DOM 快照**
```javascript
const dom = browser_eval({
  script: 'document.documentElement.outerHTML'
});

write_file({
  path: "debug/dom-snapshot.html",
  content: dom
});
```

### 9.3 性能优化

**1. 并行测试**
```javascript
// 不好的做法：串行
for (const test of tests) {
  await runTest(test);
}

// 好的做法：并行
await Promise.all(tests.map(test => runTest(test)));
```

**2. 复用浏览器实例**
```javascript
// 不好的做法：每个测试都启动新浏览器
for (const test of tests) {
  browser_launch();
  await runTest(test);
  browser_close();
}

// 好的做法：复用浏览器
browser_launch();
for (const test of tests) {
  await runTest(test);
}
browser_close();
```

**3. 智能等待**
```javascript
// 不好的做法：固定等待
await sleep(5000);

// 好的做法：轮询检查
while (!isReady()) {
  await sleep(100);
  if (Date.now() - startTime > 10000) {
    throw new Error("Timeout");
  }
}
```

---

## 10. 故障排查

### 10.1 常见问题

**问题 1: Code Agent 不响应**

```javascript
// 检查 agent 状态
const history = sessions_history({
  sessionKey: "agent:main:code-dev"
});

if (history.length === 0) {
  // Agent 未创建或已结束
  console.log("Re-spawning Code Agent...");
  sessions_spawn({
    agentId: "code-dev",
    // ...
  });
}
```

**问题 2: 浏览器测试超时**

```javascript
// 增加超时时间
browser_navigate({
  url: "http://localhost:5173",
  timeout: 30000  // 30 秒
});

// 检查服务器是否真的在运行
const serverCheck = bash({
  command: "lsof -i :5173",
  timeout: 2000
});

if (serverCheck.exitCode !== 0) {
  throw new Error("Dev server not running on port 5173");
}
```

**问题 3: 截图对比总是失败**

```javascript
// 可能是浏览器字体渲染差异
// 解决：使用更宽松的阈值
bash({
  command: "pixelmatch baseline.png current.png diff.png 0.2",
  // 阈值从 0.1 提高到 0.2
});

// 或者忽略文本区域，只比较布局
```

### 10.2 调试清单

```markdown
## Debugging Checklist

### Code Agent Issues
- [ ] Agent 是否成功创建？(`sessions_list`)
- [ ] Agent 收到任务了吗？(`sessions_history`)
- [ ] Agent 有权限访问文件吗？（workspace 配置）
- [ ] 任务描述是否清晰？

### Browser Testing Issues
- [ ] 开发服务器是否运行？(`lsof -i :PORT`)
- [ ] URL 是否正确？
- [ ] 选择器是否准确？（DOM 结构变化？）
- [ ] 是否有 CORS 问题？
- [ ] 是否有 JS 错误？（查看 console）

### Visual Regression Issues
- [ ] 基准截图是否存在？
- [ ] 阈值是否合理？
- [ ] 是否有字体/渲染差异？
- [ ] 是否有动画未完成？
```

---

## 11. 总结

### 11.1 核心价值

通过 Moltbot 协调 Claude Code，我们实现了：

✅ **完整的开发测试流程**
- Unit Test（Code Agent）
- E2E Test（Moltbot Browser）
- Visual Regression（Moltbot + pixelmatch）

✅ **自动化的质量保证**
- 自动发现问题
- 自动通知修复
- 自动验证结果

✅ **高效的迭代循环**
```
开发 → 测试 → 发现问题 → 修复 → 重新测试
（完全自动化，无需人工介入）
```

✅ **详细的测试报告**
- 截图记录
- 性能指标
- 覆盖率统计

### 11.2 适用场景

**✅ 适合使用这套方案**:
- Web 应用开发
- VS Code 插件开发
- 浏览器扩展开发
- 任何需要 UI 交互测试的前端项目

**❌ 不太适合的场景**:
- 纯后端 API（没有 UI，用 Claude Code 即可）
- 简单脚本（过度设计）
- 实时性要求极高的项目（自动化有延迟）

### 11.3 未来改进方向

**1. 更智能的测试生成**
- 根据代码变化自动生成测试用例
- AI 分析 UI 自动生成 E2E 测试

**2. 更快的反馈循环**
- 增量测试（只测试改动部分）
- 并行测试（多浏览器同时跑）

**3. 更丰富的工具集成**
- Percy（视觉回归服务）
- Lighthouse（性能审计）
- Axe（可访问性测试）

**4. 更好的错误诊断**
- AI 分析测试失败原因
- 自动建议修复方案

---

## 12. 快速开始

### 12.1 最小化示例

```javascript
// 用户请求
"开发一个 Hello World 页面并测试"

// Moltbot 自动执行
1. 创建 Code Agent
2. Code Agent 编写代码
3. Master 启动浏览器
4. 验证 "Hello World" 显示
5. 截图保存
6. 返回结果
```

### 12.2 完整示例模板

保存为 `~/clawd/templates/web-dev-test.js`:

```javascript
/**
 * Web Development + Testing Template
 *
 * Usage:
 *   "使用 web-dev-test 模板开发一个 [项目描述]"
 */

async function webDevTest(projectName, requirements) {
  // 1. 创建项目
  await bash(`mkdir -p ${projectName} && cd ${projectName} && npm init -y`);

  // 2. 创建 Code Agent
  await sessions_spawn({
    agentId: `${projectName}-dev`,
    instructions: requirements,
    tools: ["read_file", "write_file", "edit_file", "bash"]
  });

  // 3. 等待开发完成
  await waitForCompletion(`${projectName}-dev`);

  // 4. 运行 Unit Tests
  const unitResult = await bash(`cd ${projectName} && npm test`);
  if (unitResult.exitCode !== 0) {
    await fixAndRetry();
  }

  // 5. 启动服务器
  await bash(`cd ${projectName} && npm run dev &`);

  // 6. E2E 测试
  await browser_navigate({ url: "http://localhost:3000" });
  await runE2ETests();

  // 7. 生成报告
  await generateReport();

  return "✅ 开发和测试完成";
}
```

---

**文档完成** 🎉
