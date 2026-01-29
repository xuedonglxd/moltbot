# 37 - Android应用需求

> **版本**: v1.0
> **最后更新**: 2026-01-29
> **依赖文档**: 04-Gateway基础架构需求, 32-设备节点需求
> **后续文档**: 38-单元测试需求

---

## 1. 需求概述

实现**Android 原生应用**，提供移动端 Agent 对话和设备节点能力。

**核心目标:**
- **聊天界面**: Material Design 对话界面
- **设备能力**: 相机、位置等能力节点
- **通知**: FCM 推送通知
- **后台服务**: 保持连接

---

## 2. 技术栈

- **语言**: Kotlin + Jetpack Compose
- **架构**: MVVM
- **网络**: OkHttp + WebSocket

---

## 3. 核心功能

### 3.1 聊天界面

```kotlin
@Composable
fun ChatScreen(viewModel: ChatViewModel) {
    Column {
        LazyColumn(
            modifier = Modifier.weight(1f)
        ) {
            items(viewModel.messages) { message ->
                MessageItem(message)
            }
        }
        MessageInput()
    }
}
```

### 3.2 设备节点

```kotlin
class DeviceCapabilities(context: Context) {
    suspend fun takePhoto(): Bitmap? {
        // 调用相机
    }

    suspend fun getLocation(): Location? {
        // 获取位置
    }
}
```

---

**文档完成** ✅
