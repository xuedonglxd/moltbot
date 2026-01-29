# 35 - macOS应用需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 04-Gateway基础架构需求
> **后续文档**: 36-iOS应用需求

---

## 1. 需求概述

实现**macOS 原生应用**，提供菜单栏 Agent、Gateway 管理功能。

**核心目标:**
- **菜单栏应用**: 常驻菜单栏
- **Gateway 管理**: 启动/停止 Gateway
- **快捷对话**: 全局快捷键唤起对话
- **系统集成**: 通知、文件拖拽

---

## 2. 技术栈

- **语言**: Swift + SwiftUI
- **架构**: MVVM
- **进程管理**: LaunchAgent

---

## 3. 核心功能

### 3.1 菜单栏图标

```swift
class StatusBarController {
    var statusItem: NSStatusItem?

    func setupStatusBar() {
        statusItem = NSStatusBar.system.statusItem(
            withLength: NSStatusItem.variableLength
        )
        statusItem?.button?.image = NSImage(named: "MenuBarIcon")
        statusItem?.menu = createMenu()
    }
}
```

### 3.2 Gateway 管理

```swift
func startGateway() {
    let task = Process()
    task.executableURL = URL(fileURLWithPath: "/usr/local/bin/moltbot")
    task.arguments = ["gateway", "run", "--bind", "loopback"]
    try? task.run()
}
```

---

**文档完成** ✅
