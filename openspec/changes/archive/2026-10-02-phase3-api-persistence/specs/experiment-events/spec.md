# Spec Delta

## ADDED Requirements

### Requirement: 持久化 Event Log
Event Log MUST 提供数据库持久化实现：事件 append-only 落库、(runId, sequence) 唯一约束、sequence 在事务内分配以保证并发安全；服务重启后历史事件 MUST 完整可读。

#### Scenario: 重启后事件完整
- **WHEN** 写入若干事件后重启服务再按 runId 读取
- **THEN** 返回与写入时完全一致的事件流

#### Scenario: 唯一约束兜底
- **WHEN** 出现并发追加竞争
- **THEN** 数据库中不产生重复 (runId, sequence) 记录
