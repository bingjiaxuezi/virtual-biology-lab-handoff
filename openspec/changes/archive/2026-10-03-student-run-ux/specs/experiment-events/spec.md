# Delta for experiment-events

## MODIFIED Requirements

### Requirement: 核心事件类型完整
Event 模型 MUST 支持：RUN_STARTED、NODE_ENTERED、ACTION_PERFORMED、VARIABLE_CHANGED、OBSERVATION_SUBMITTED、QUESTION_ANSWERED、RULE_APPLIED、TRANSITION_TAKEN、STEPPED_BACK、AI_BRIEFING_VIEWED、AI_HINT_REQUESTED、AI_HINT_SHOWN、AI_OBSERVATION_ASSISTED、AI_REVIEW_GENERATED、RUN_COMPLETED。

#### Scenario: 每种事件类型可构造且可序列化
- **WHEN** 构造 15 种事件类型各一个实例并 JSON 序列化
- **THEN** 全部成功且反序列化后字段不丢失

#### Scenario: 回退事件记录事实
- **WHEN** 学生从节点 B 回退到节点 A
- **THEN** 追加一条 STEPPED_BACK 事件，payload 含 from（B）与 to（A），既有事件不被修改或删除
