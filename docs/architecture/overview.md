# 总体架构

## 总体原则

```text
Teacher / Student
       │
       ▼
     Web App
       │
       ▼
    NestJS API
       │
 ┌─────┼───────────────────────────────┐
 ▼     ▼                               ▼
Domain AI Gateway                  Asset Service
 │      │                              │
 │   Provider Router                StorageProvider
 │   ├─ OpenAIProvider             ├─ Local/S3
 │   ├─ DeepSeekProvider           ├─ Aliyun OSS
 │   └─ Future Providers           └─ Future Providers
 │
 ▼
Experiment Definition
 │
 ├─ Validator
 ├─ Capability Validation
 ├─ Compiler
 └─ XState Adapter
       │
       ▼
Experiment Runtime
       │
       ├─ Node Renderer
       ├─ Rule Executor
       ├─ State Snapshot
       └─ Event Recorder
```

## 关键边界

### 1. Definition 与编辑器解耦

React Flow 只保存视觉布局信息或编辑状态；领域数据必须映射回 `Experiment Definition`。

### 2. Definition 与 Runtime 解耦

`Experiment Definition` 经 `Experiment Compiler` 编译成 XState Machine。不得把 XState Machine JSON 直接作为持久化模型。

### 3. Experiment 与资源存储解耦

Definition 中只存 `assetId`。真实对象存储位置由 Asset Service 管理。

### 4. AI 与供应商解耦

业务服务只依赖 `AIProvider`/`AIRouter`，不直接调用 OpenAI/DeepSeek SDK。

### 5. Run State 与 Event Log 解耦

- Event：事实
- State：当前快照

未来实验回放、错误路径分析、AI Review 均以 Event 为主要来源。

## 推荐模块

### apps/web

- Teacher Studio
- Student Runtime

### apps/api

- Auth
- Experiment
- ExperimentVersion
- ExperimentRun
- ExperimentEvent
- Asset
- AI

### packages

- experiment-schema
- experiment-domain
- capability-registry
- experiment-validator
- experiment-compiler
- experiment-runtime
- experiment-events
- ai-core
- storage-core
- shared
