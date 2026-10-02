# Spec Delta

## ADDED Requirements

### Requirement: AI 事件纳入统一轨迹
AI 辅助产生的事件（AI_BRIEFING_VIEWED/AI_HINT_REQUESTED/AI_HINT_SHOWN/AI_OBSERVATION_ASSISTED/AI_REVIEW_GENERATED）MUST 与学生命令事件写入同一事件流：共用 (runId, sequence) 序列与唯一约束，追加在事务内完成并同步 Run 的 lastSequence；教师轨迹查询 MUST 原样呈现这些事件。

#### Scenario: 轨迹包含 AI 事件
- **WHEN** 学生在运行中使用过提示或复盘
- **THEN** 教师查看该 Run 的事件流时能看到对应 AI 事件，sequence 与学生事件混合单调递增
