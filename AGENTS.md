# AGENTS.md

本仓库用于开发“AI 生物仿真实验平台”。

## 必须遵守的架构约束

- `Experiment Definition` 是实验领域唯一真值源。
- React Flow 只负责编辑/展示，不得作为持久化领域模型。
- XState 只负责 Runtime 执行，不得作为持久化模型。
- AI 只能生成 `Capability Registry` 已支持的节点、变量、操作符和效果。
- Teacher AI 产生的是 Draft/Change Proposal，不能直接发布。
- Student AI 对 Runtime 只读，不能替学生执行操作、提交答案或改变实验状态。
- Experiment Definition 中资源只引用 `assetId`，禁止写死 S3/OSS/CDN URL。
- AI Provider、Storage Provider、Media Processor 必须通过接口隔离具体供应商。
- Event Log 是事实记录；Run State 是快照。
- 优先使用成熟第三方库，不重复造通用轮子。
- Iteration 1 使用模块化单体，不主动引入微服务或消息队列。

## 开发前必读

- `docs/product/overview.md`
- `docs/product/iteration-1.md`
- `docs/architecture/overview.md`
- `docs/domain/core-model.md`
- `docs/domain/experiment-definition-v0.1.md`
- `docs/domain/capability-registry-v0.1.md`

## 复杂任务要求

涉及以下任一情况时，先更新或创建 ExecPlan，再编码：

- 领域模型变化
- Experiment Definition Schema 变化
- Capability Registry 变化
- Compiler/Runtime 行为变化
- AI 生成约束变化
- Provider 接口变化

## 当前优先级

Phase 1：

`Experiment Definition v0.1 + Capability Registry v0.1 + Zod Schema + Validator + Sample Experiment + Tests`

在 Phase 1 通过验收前，不开发完整 Teacher Studio、Student Runtime 或正式 AI 能力。
