# 36 - iOS应用需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 04-Gateway基础架构需求, 32-设备节点需求
> **后续文档**: 37-Android应用需求

---

## 1. 需求概述

实现**iOS 原生应用**，提供移动端 Agent 对话和设备节点能力。

**核心目标:**
- **聊天界面**: 移动端对话体验
- **设备能力**: 相机、位置等能力节点
- **通知**: 接收 Agent 通知
- **离线支持**: 本地缓存

---

## 2. 技术栈

- **语言**: Swift + SwiftUI
- **架构**: MVVM
- **网络**: URLSession + WebSocket

---

## 3. 核心功能

### 3.1 聊天界面

```swift
struct ChatView: View {
    @StateObject var viewModel: ChatViewModel

    var body: some View {
        VStack {
            ScrollView {
                ForEach(viewModel.messages) { message in
                    MessageRow(message: message)
                }
            }
            MessageInputView()
        }
    }
}
```

### 3.2 设备节点

```swift
class DeviceCapabilities {
    func takePhoto() async -> UIImage? {
        // 调用相机
    }

    func getLocation() async -> CLLocation? {
        // 获取位置
    }
}
```

---

**文档完成** ✅
