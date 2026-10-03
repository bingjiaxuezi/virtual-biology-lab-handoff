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
- `docs/design/ui-guidelines.md`（涉及任何前端页面时必读）

## 复杂任务要求

涉及以下任一情况时，先更新或创建 ExecPlan，再编码：

- 领域模型变化
- Experiment Definition Schema 变化
- Capability Registry 变化
- Compiler/Runtime 行为变化
- AI 生成约束变化
- Provider 接口变化

## OpenSpec 工作流（强制）

本仓库已通过 OpenSpec（`@fission-ai/openspec`）进行规格驱动开发，所有任务必须走 OpenSpec 流程：

1. **先提案，后编码**：任何新功能、行为变化、架构调整或上述"复杂任务"列表中的事项，必须先创建 Change Proposal（`$openspec-propose`），经确认后才能实现。禁止绕过提案直接改代码。
2. **提案产物**：提案必须包含 `proposal.md`、`tasks.md` 以及涉及的 spec delta，全部用中文撰写（结构标题和 SHALL/MUST 关键字保留英文，见 `openspec/config.yaml`）。
3. **按 tasks 实施**：实现时使用 `$openspec-apply-change`，严格按 `tasks.md` 勾选推进；实现不得偏离已批准的 spec delta。
4. **完成后归档**：任务验收后用 `$openspec-archive-change` 归档，将 delta 合并进 `openspec/specs/` 的正式规格。
5. **规格即文档**：`openspec/specs/` 中的规格与 `docs/` 文档必须保持一致；两者冲突时先解决冲突再继续开发。
6. OpenSpec 技能位于 `.agents/skills/`，不要手工编辑其中的技能文件；升级 OpenSpec 后运行 `openspec update` 同步。

## 当前优先级

Phase 1：

`Experiment Definition v0.1 + Capability Registry v0.1 + Zod Schema + Validator + Sample Experiment + Tests`

在 Phase 1 通过验收前，不开发完整 Teacher Studio、Student Runtime 或正式 AI 能力。
