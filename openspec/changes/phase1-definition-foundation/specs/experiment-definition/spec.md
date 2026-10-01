# Spec Delta

## Purpose

定义 Experiment Definition v0.1 的领域模型与序列化契约，作为 AI 生成、编辑器、Runtime 和 Validator 共同遵循的唯一真值源结构。

## ADDED Requirements

### Requirement: 顶层结构完整
Experiment Definition MUST 包含 `schemaVersion`（固定 `'0.1'`）、`id`、`version`、`metadata`、`teaching`、`variables`、`assets`、`nodes`、`transitions`、`rules`、`assessment`、`aiPolicy` 字段，缺失任一必填字段 SHALL 视为结构非法。

#### Scenario: 合法定义通过结构校验
- **WHEN** 解析一份包含全部必填字段的 Definition JSON
- **THEN** 结构校验通过并返回强类型对象

#### Scenario: 缺少必填字段被拒绝
- **WHEN** 解析一份缺少 `nodes` 或 `aiPolicy` 的 Definition JSON
- **THEN** 结构校验失败并指出缺失字段路径

### Requirement: 变量类型受限且可判别
Variable MUST 为 NUMBER、ENUM、BOOLEAN 之一的 discriminated union：NUMBER 含 defaultValue/min/max/unit，ENUM 含 options/defaultValue，BOOLEAN 含 defaultValue。自由文本观察 MUST NOT 作为状态变量。

#### Scenario: 三种变量类型各自解析成功
- **WHEN** 解析分别含 NUMBER、ENUM、BOOLEAN 变量的 Definition
- **THEN** 各变量按其类型专属字段解析成功

#### Scenario: 未知变量类型被拒绝
- **WHEN** 解析含 `type: "TEXT"` 变量的 Definition
- **THEN** 结构校验失败

### Requirement: 节点类型受限且可判别
Node MUST 为 START、ACTION、VARIABLE_INPUT、MEDIA、OBSERVATION、QUESTION、CONDITION、END 之一的 discriminated union，各类型携带自己的 config。START 恰好一个，END 至少一个（由 Validation 保证）。

#### Scenario: 合法节点集合解析成功
- **WHEN** 解析含全部 8 种合法类型节点的 Definition
- **THEN** 结构校验通过

#### Scenario: 未支持节点类型被拒绝
- **WHEN** 解析含 `type: "SIMULATION_3D"` 节点的 Definition
- **THEN** 校验失败并报告该节点路径

### Requirement: Transition 与 Rule 职责分离
Transition MUST 只表达流程跳转（id/from/to/condition?/priority?），Rule MUST 只表达世界状态变化（id/when/effects），Rule MUST NOT 提供 GOTO 类流程效果。

#### Scenario: Rule 不含流程跳转效果
- **WHEN** 解析 effects 中含 `GOTO` 的 Rule
- **THEN** 结构校验失败

### Requirement: Effect 类型受限且可判别
Rule Effect MUST 为 SET、ADD、SUBTRACT、SCORE 之一的 discriminated union，并携带目标变量与值。

#### Scenario: 四种 Effect 解析成功
- **WHEN** 解析分别含 SET/ADD/SUBTRACT/SCORE 效果的 Rule
- **THEN** 结构校验通过

### Requirement: Condition 操作符受限
Condition 比较操作符 MUST 为 EQ、NEQ、GT、LT、GTE、LTE 之一，且必须引用已定义变量与类型匹配的值。

#### Scenario: 非法操作符被拒绝
- **WHEN** 解析含操作符 `CONTAINS` 的 Condition
- **THEN** 结构校验失败

### Requirement: 资源只引用 assetId
Asset 引用 MUST 只含逻辑 id、`assetId` 与 type（VIDEO/IMAGE/TEXT），Definition 中 MUST NOT 出现任何供应商 URL（S3/OSS/CDN）。

#### Scenario: 包含供应商 URL 被拒绝
- **WHEN** 解析 asset 中含 `https://*.amazonaws.com/...` 字段的 Definition
- **THEN** 结构校验失败

### Requirement: AI Policy 受教师控制
AIPolicy MUST 包含 briefing/tutor/observationAssist/review 四组开关，其中 `tutor.hintLevel` 为 LIGHT/STANDARD/STRONG，`tutor.revealAnswer` 在 v0.1 MUST 固定为 false。

#### Scenario: revealAnswer 为 true 被拒绝
- **WHEN** 解析 `tutor.revealAnswer: true` 的 Definition
- **THEN** 校验失败

### Requirement: Schema 可导出类型与 JSON Schema
Schema 实现 MUST 导出对应 TypeScript 类型，并 SHALL 能转换为 JSON Schema 供外部工具使用。

#### Scenario: 导出 JSON Schema
- **WHEN** 调用 JSON Schema 导出
- **THEN** 得到描述同一结构的 JSON Schema 文档
