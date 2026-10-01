# Spec Delta

## Purpose

定义 Experiment Event 模型与 append-only Event Log，作为学生实验过程的事实记录，为教师复盘、AI Tutor 上下文与 Run State 推导提供统一数据源。

## ADDED Requirements

### Requirement: 核心事件类型完整
Event 模型 MUST 支持：RUN_STARTED、NODE_ENTERED、ACTION_PERFORMED、VARIABLE_CHANGED、OBSERVATION_SUBMITTED、QUESTION_ANSWERED、RULE_APPLIED、TRANSITION_TAKEN、AI_BRIEFING_VIEWED、AI_HINT_REQUESTED、AI_HINT_SHOWN、AI_OBSERVATION_ASSISTED、AI_REVIEW_GENERATED、RUN_COMPLETED。

#### Scenario: 每种事件类型可构造且可序列化
- **WHEN** 构造 14 种事件类型各一个实例并 JSON 序列化
- **THEN** 全部成功且反序列化后字段不丢失

### Requirement: 事件字段完整
每个 Event MUST 含 eventId、runId、sequence、type、timestamp，并 SHALL 含 nodeId 与 payload；stateBefore/stateAfter 为可选。

#### Scenario: 缺必填字段被拒绝
- **WHEN** 构造缺少 runId 或 sequence 的 Event
- **THEN** 校验失败

### Requirement: Event Log append-only
Event Log MUST 只增不改：不提供更新或删除历史事件的接口；修正状态 MUST 通过追加补偿/纠正事件完成。

#### Scenario: 无修改入口
- **WHEN** 检查 Event Log 的公开接口
- **THEN** 不存在 update/delete 类方法

### Requirement: sequence 单调递增
同一 Run 内 Event 的 sequence MUST 从 1 开始严格单调递增；追加乱序或重复 sequence MUST 被拒绝。

#### Scenario: 顺序追加成功
- **WHEN** 依次追加 sequence 1、2、3 的事件
- **THEN** 全部成功且读取顺序一致

#### Scenario: 乱序追加被拒绝
- **WHEN** 在 sequence 2 之后追加 sequence 2 或 5
- **THEN** 追加被拒绝并报错

### Requirement: 事件按 Run 检索
Event Log MUST 支持按 runId 读取完整事件流，且返回顺序与 sequence 一致。

#### Scenario: 按 Run 读取
- **WHEN** 两个 Run 交替写入事件后按 runId 读取
- **THEN** 每个 Run 得到各自完整且有序的事件流
