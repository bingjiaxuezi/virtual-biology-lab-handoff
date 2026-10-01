# Design

## Context

仓库当前是纯文档交接包，尚无任何代码工程。动机见 proposal.md。关键约束（来自 AGENTS.md 与 docs/architecture）：Experiment Definition 是唯一真值源；React Flow / XState 只在未来分别承担编辑与运行职责，本阶段不引入；资源只引用 assetId；优先使用成熟第三方库；Iteration 1 为模块化单体。

## Goals / Non-Goals

**Goals:**
- pnpm monorepo + TypeScript strict + Vitest 的最小工程骨架
- 三个纯领域包：`experiment-schema`、`capability-registry`、`experiment-validator`，无 UI/AI/Storage 依赖
- Validator 输出稳定的 `{ code, path, message, severity }`，可直接服务未来的 AI Repair
- 样板实验 + 10 项测试作为验收

**Non-Goals:**
- 完整 Teacher Studio、Student Runtime、正式 AI Provider 调用
- JSON Schema 的实际外部消费方（只保证可导出）
- Runtime 执行语义（Effect 如何改变世界状态属后续阶段）

## Decisions

### 包划分与依赖方向
`experiment-schema`（纯 Zod 模型，零业务逻辑）← `capability-registry`（依赖 schema 的类型）← `experiment-validator`（依赖前两者）。
理由：单向依赖保证 Registry 与 Validator 永远围绕同一 Schema 工作；schema 包不依赖任何人，可被未来 editor/runtime/ai-core 直接复用。
备选：单包多模块——拒绝，交接包 README 已明确分包结构，且分包能物理阻止 UI 依赖混入。

### Schema 即类型：Zod 单一来源
用 Zod schema 定义全部结构，TypeScript 类型通过 `z.infer` 派生，不手写 interface。
理由：避免「类型一份、运行时校验一份」的双写漂移；`zod-to-json-schema`（或 zod v4 原生能力）满足 JSON Schema 导出。
备选：先写 TS interface 再生成 JSON Schema（如 ts-json-schema-generator）——拒绝，运行时校验缺失。
Node / Variable / RuleEffect 均用 `z.discriminatedUnion('type', ...)`，判别字段统一为 `type`。

### Validator 三段管线与错误模型
`validateExperiment(def, registry)` 顺序执行：Structural（`schema.safeParse`）→ Semantic（纯函数遍历图与引用）→ Capability（查 Registry）。Structural 失败即短路。结果聚合为 `ValidationIssue[]`：`{ code: string, path: string, message: string, severity: 'error' | 'warning' }`，错误码用稳定常量（如 `START_MISSING`、`START_DUPLICATE`、`END_UNREACHABLE`、`TRANSITION_TARGET_MISSING`、`VARIABLE_REF_UNDEFINED`、`ASSET_REF_UNDEFINED`、`CONDITION_TYPE_INCOMPATIBLE`、`EFFECT_TYPE_INCOMPATIBLE`、`CAPABILITY_UNSUPPORTED`）。
理由：稳定错误码是 AI Repair 和编辑器定位的契约；聚合而非抛出，一次校验报告全部问题。
备选：直接透传 Zod 错误——拒绝，Zod issue 格式是库实现细节，需映射成自有错误模型。

### 语义校验中的类型兼容规则表
Condition 操作符兼容性用一张显式映射表：`NUMBER → 全部 6 个操作符；ENUM → EQ/NEQ；BOOLEAN → EQ/NEQ`。Effect 兼容性：ADD/SUBTRACT/SCORE 仅 NUMBER；SET 要求值类型与变量类型一致。
理由：表驱动比散落的 if 更易扩展和单测；这张表也是未来 Capability Registry 元数据的候选归属，v0.1 先放 validator 内。

### 可达性算法
从唯一 START 出发沿 transitions 做 BFS/DFS；END 不在可达集 → error；普通节点不可达 → warning。
理由：规则简单、无环依赖问题（允许图有环，BFS 天然处理）；不判断「能否走到 END」的复杂路径条件（条件求值属于 Runtime）。

### Registry 的条目形态
Registry 是 `Map<NodeType, NodeCapability>` 加同构的 variable/operator/effect/media 注册表，条目含 version/description/configSchema/aiAuthoringHint 及可选 runtimeHandler/renderer 字符串占位。
理由：满足「不只是字符串数组」的文档要求，又为未来插件化留位；configSchema 用 zod schema 而非 JSON Schema，保持栈内一致。

## Risks / Trade-offs

- [Zod v3 与 v4 的 JSON Schema 导出能力差异] → 实施时先锁定一个主版本并在 package.json 固定；导出测试用例验证。
- [语义规则表散落在 validator，未来 Registry 演进可能重复] → 表中每项注明来源，Phase 2 再评估是否上移到 Registry 元数据。
- [不可达节点 warning 策略可能与未来编辑器「删除孤立节点」交互冲突] → v0.1 仅报告不阻断，交互策略留给编辑器阶段。
- [样板实验 JSON 手写易与 Schema 漂移] → 测试 1 强制样板通过完整校验，漂移即红。
