# 核心领域模型 v0.1

## 四个核心对象

### ExperimentDefinition

描述“实验是什么”。

包含：

- metadata
- teaching
- variables
- assets references
- nodes
- transitions
- rules
- assessment
- aiPolicy

### CapabilityRegistry

描述“平台会什么”。

包含：

- nodeTypes
- variableTypes
- operators
- effects
- mediaTypes
- renderer capabilities
- authoring hints

### ExperimentRun

描述“某个学生做了一次实验”。

必须绑定具体 `ExperimentVersion`。

包含：

- runId
- experimentVersionId
- studentId
- status
- currentNodeId
- state
- score
- startedAt/completedAt

### ExperimentEvent

描述“实验运行过程中真实发生过什么”。

包含：

- eventId
- runId
- sequence
- type
- nodeId
- payload
- stateBefore/stateAfter（可选，按成本评估）
- timestamp

## 重要约束

- Run 绑定 Version，不绑定“当前 Experiment”。
- Version 发布后不可原地修改；修改产生新 Version。
- Event sequence 在同一个 Run 内单调递增。
- State 可以从 Event 推导/校验，但 Runtime 可保存快照提升性能。
- Student AI 只能读 Run/Event，不写 Runtime。
