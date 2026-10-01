# Proposal

## Why

平台的一切（AI 生成、Teacher Studio、Student Runtime、事件记录）都围绕 `Experiment Definition` 这一唯一领域真值源展开，但目前它只存在于文档中，没有可执行的 Schema、Capability Registry 和 Validator。Phase 1 的目标是把文档落成代码：用 Zod 定义 Schema、实现 Capability Registry v0.1 和三层 Validator，并用样板实验「温度对酶活性的影响」加测试证明这套基础可用。这是后续所有教师端/学生端/AI 能力的前置条件。

## What Changes

- 初始化 pnpm monorepo（TypeScript strict + Vitest），建立 `packages/experiment-schema`、`packages/capability-registry`、`packages/experiment-validator` 三个包。
- 用 Zod 实现 `Experiment Definition v0.1` 完整 Schema：Node / Variable / Rule Effect 均使用 discriminated union，导出 TypeScript 类型，可转换 JSON Schema。
- 实现 Capability Registry v0.1：8 种 Node Type、3 种 Variable Type、6 种 Operator、4 种 Effect、3 种 Media Type；Node Capability 含 type/version/config schema/description/aiAuthoringHint。
- 实现三层 Validator：Structural（Zod parse）、Semantic（图完整性、引用完整性、类型兼容）、Capability（所有类型必须存在于 Registry），输出稳定的 error code/path/message。
- 落地样板实验 `examples/enzyme-temperature.v0.1.json`（temperature NUMBER、sampleStatus ENUM、>60℃ 分支、NORMAL/DENATURED 结果、MEDIA、OBSERVATION、AI Policy）。
- 按 ExecPlan 工作包 F 补齐 10 项测试。

## Capabilities

### New Capabilities

- `experiment-definition`: Experiment Definition v0.1 的领域模型与 Schema 契约——顶层结构、变量、节点、Transition、Rule、Condition、Asset 引用、Assessment、AI Policy。
- `capability-registry`: 平台能力注册表——声明当前支持的节点/变量/操作符/效果/媒体类型及其元数据，作为 AI 生成约束、编辑器节点库、Validation 与 Runtime 选择的统一来源。
- `experiment-validation`: Definition 校验能力——结构校验、语义校验（START 唯一、END 可达、引用完整、类型兼容等）与能力校验，输出稳定错误码。

### Modified Capabilities

（无，本变更全部为新增能力。）

## Impact

- 新增：pnpm workspace、3 个 packages、`examples/` 样板实验、Vitest 测试。
- 依赖：仅引入 `zod`、`vitest`、`typescript` 及 pnpm workspace 基础工具链；不引入 UI、AI Provider、Storage 相关依赖。
- 约束：React Flow / XState 不进入本阶段；Definition 中资源只引用 `assetId`。
- 文档同步：`docs/plans/phase-1-exec-plan.md` 与 `docs/domain/*` 为规格来源，实现以本变更的 spec delta 为准并保持一致。
