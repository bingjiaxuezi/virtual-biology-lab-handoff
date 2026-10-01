# capability-registry Specification

## Purpose

提供平台能力注册表（Capability Registry v0.1），统一声明当前支持的节点、变量、操作符、效果与媒体类型及其元数据，作为 AI 生成约束、编辑器节点库、Validation 与 Runtime 选择的唯一能力来源。

## Requirements

### Requirement: 注册表覆盖 Iteration 1 全部能力
Registry MUST 声明：8 种 Node Type（START/ACTION/VARIABLE_INPUT/MEDIA/OBSERVATION/QUESTION/CONDITION/END）、3 种 Variable Type（NUMBER/ENUM/BOOLEAN）、6 种 Operator（EQ/NEQ/GT/LT/GTE/LTE）、4 种 Effect（SET/ADD/SUBTRACT/SCORE）、3 种 Media Type（VIDEO/IMAGE/TEXT）。

#### Scenario: 查询全部 Node Type
- **WHEN** 枚举 Registry 中的 Node Capability
- **THEN** 返回恰好上述 8 种类型

#### Scenario: 查询未注册能力
- **WHEN** 查询类型 `SIMULATION_3D`
- **THEN** 返回不存在，而不是虚构条目

### Requirement: Node Capability 元数据完整
每个 Node Capability MUST 含 type、version、description、configSchema、aiAuthoringHint，并 SHALL 预留 runtimeHandler 与 renderer 关联位。

#### Scenario: 读取 VARIABLE_INPUT 条目
- **WHEN** 读取 `VARIABLE_INPUT` 的 Capability
- **THEN** 返回含 version、description、configSchema（含 variableId/inputMode）与 aiAuthoringHint 的完整条目

### Requirement: Registry 是结构化插件入口
Registry MUST NOT 只是字符串数组；每个条目 MUST 能关联 config schema、编辑器元数据、runtime handler、renderer、validator 与 AI authoring hint，以支持后续能力插件化扩展。

#### Scenario: 新增能力条目不影响既有条目
- **WHEN** 向 Registry 注册一个新 Node Capability
- **THEN** 既有 8 种条目的内容与版本不变
