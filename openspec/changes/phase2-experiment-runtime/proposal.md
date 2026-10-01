# Proposal

## Why

Phase 1 已经让 Experiment Definition 可定义、可校验，但它还是静态数据。Iteration 1 要验证的两件核心事——「统一 Runtime 能运行多个 Definition，而不是按实验写页面」和「Event Log 完整记录学生实验过程」——都需要一个由 Definition 驱动的执行内核。本变更在纯领域层实现统一 Runtime 与 append-only Event Log，不接 UI、不接数据库，为后续 Student Web 和教师复盘提供可复用的执行与事实记录能力。

## What Changes

- 新增 `packages/experiment-events`：Experiment Event 模型（14 种核心事件类型）、append-only Event Log 抽象与内存实现、Run 内 sequence 单调递增保证。
- 新增 `packages/experiment-runtime`：统一 Runtime——加载固定版本的 Definition（先经 Phase 1 Validator 校验）、初始化 Run State（变量默认值 + 初始分）、接收并校验 Student Command、求值 Condition、应用 Rule Effect、按条件与优先级选择 Transition、更新 Run Status、逐步产生 Event、生成可恢复快照。
- Runtime 状态机执行使用 XState v5（成熟库复用），Definition 到状态机的映射在包内完成；XState 不作为持久化模型。
- Student Command 白名单：SET_VARIABLE / PERFORM_ACTION / SUBMIT_OBSERVATION / ANSWER_QUESTION / ADVANCE；AI 相关事件（HINT 等）只记录事实，不由 Runtime 触发。
- 用「温度对酶活性」样板实验做端到端测试：80℃ 走高温分支、37℃ 走正常分支、事件轨迹完整、快照可恢复。

## Capabilities

### New Capabilities

- `experiment-events`: Experiment Event 模型与 append-only Event Log——事件类型、字段、sequence 单调递增、只增不改与补偿事件原则。
- `experiment-runtime`: 统一实验运行时——Run 生命周期（CREATED/RUNNING/COMPLETED/ABORTED）、命令处理、规则与条件求值、流程跳转、快照恢复，全部从 Definition 驱动而非按实验硬编码。

### Modified Capabilities

（无，本变更全部为新增能力。）

## Impact

- 新增：2 个 packages（experiment-events、experiment-runtime），依赖 Phase 1 的 schema/registry/validator 与 `xstate`。
- 依赖：仅新增 `xstate`（成熟状态机库，符合技术栈约定）；不引入 UI、AI SDK、数据库、HTTP 框架。
- 约束：Run 绑定固定 Experiment Version；Event append-only；Student AI 只读，本包不提供任何 AI 写入口。
- 文档来源：`docs/domain/core-model.md`、`docs/domain/runtime-event-model.md`，实现以本变更 spec delta 为准。
