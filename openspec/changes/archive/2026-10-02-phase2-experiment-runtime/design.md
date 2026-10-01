# Design

## Context

Phase 1 已交付 Definition Schema、Capability Registry 与三层 Validator（纯领域包，无 UI/AI/DB 依赖）。本变更沿用同一 monorepo 与约束：XState 只负责 Runtime 执行、不得作为持久化模型；Event 是事实、Run State 是快照；优先复用成熟库。动机见 proposal.md。

## Goals / Non-Goals

**Goals:**
- `experiment-events`：事件模型 + append-only 接口 + 内存实现，sequence 严格单调
- `experiment-runtime`：Definition 驱动的执行内核（命令、规则、跳转、事件、快照），用样板实验端到端验证
- 领域逻辑（条件/规则求值、选边）为纯函数，可独立于 XState 测试

**Non-Goals:**
- 持久化到数据库（Event Log 只定义接口 + 内存实现，DB 适配器后续阶段）
- Student Web 渲染、AI Provider 调用、HTTP API
- 摘要策略、补偿事件的实际业务场景（只保证原则可表达）

## Decisions

### XState v5 作为流程引擎，规则引擎独立
Definition 在 Run 启动时编译为 XState v5 machine：节点→state，Transition→带 guard 的 edge（guard 由 condition 编译，priority 通过 guard 顺序保证）。Run State（变量值、score）放在 machine context。Rule 不编译进 machine——规则响应的是「世界状态变化」而非节点事件，统一在命令处理管线里由纯函数 `evaluateRules(definition, state)` 单遍求值（按 Definition 中声明顺序，不做不动点迭代）。
理由：职责与文档一致（Transition 管流程、Rule 管状态）；纯函数规则引擎可脱离 XState 单测；XState 实例可随时丢弃重建，天然满足「不作为持久化模型」。
备选：规则也建模为 XState 的 always/invoke——拒绝，规则触发时机与节点生命周期不同步，会隐晦难测。

### 命令处理管线
`dispatch(command)` 统一管线：白名单校验 → 参数校验（变量存在/类型/min-max/options）→ 应用变更 → 规则求值 → （ADVANCE 时）选边跳转 → 写事件。任何一步失败即整体拒绝，不产生部分效果。
理由：原子性保证事件流与状态一致，AI Repair/复盘才能信任 Event Log。

### 显式 ADVANCE 推进
v0.1 不自动跳节点：学生完成当前节点交互后发送 ADVANCE，Runtime 才评估出边并跳转（CONDITION 节点同样显式推进，其分支语义由出边 condition 决定）。
理由：确定性最强、与「学生操作产生事件」的原则一致；自动推进属于 UX 优化，留给 Runtime Renderer 层。
备选：MEDIA/CONDITION 自动前进——推迟，等 Student Web 联调时再评估。

### Event Log 接口 + 内存实现
`EventLog` 接口：`append(event)`（校验 sequence 连续性）、`getByRun(runId)`。v0.1 提供 `InMemoryEventLog`；事件由 Runtime 构造（sequence 由 Log 分配或 Runtime 携带，定为 Log 分配：append 时填入下一个 sequence，杜绝乱序来源）。
理由：接口先行让 DB 适配器零成本替换；由 Log 分配 sequence 比由 Runtime 分配更难出错。

### 快照 = 水位标记
快照含 runId、status、currentNodeId、state、score、lastSequence。恢复时直接从快照重建 XState machine（同一定义再编译）并从 lastSequence 继续。
理由：Event Log 是事实源，快照只是性能优化；重建 machine 而非序列化 machine 实例，避免 XState 内部状态泄漏进持久层。

## Risks / Trade-offs

- [XState v5 API 学习与集成成本] → 流程引擎只用到 machine/guard/context 子集，集成面收窄在一个编译函数内。
- [规则单遍求值不支持规则链（A 改 x 触发 B）] → v0.1 明确单遍语义并写入 spec 注释；样板实验两条规则互斥，不受影响；链式规则若未来需要再立项。
- [显式 ADVANCE 可能让 UI 觉得繁琐] → 属 UX 层决策，Renderer 可以在用户动作后自动发 ADVANCE，内核保持简单。
- [条件值类型在运行时仍可能出错（如 JSON 反序列化）] → 规则/条件求值前复用 Phase 1 的类型兼容表防御。
