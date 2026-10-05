# experiment-events Specification Delta

## MODIFIED Requirements

### Requirement: 核心事件类型完整
Event 模型 MUST 支持：RUN_STARTED、NODE_ENTERED、ACTION_PERFORMED、VARIABLE_CHANGED、OBSERVATION_SUBMITTED、QUESTION_ANSWERED、RULE_APPLIED、TRANSITION_TAKEN、STEPPED_BACK、JUMPED_TO、AI_BRIEFING_VIEWED、AI_HINT_REQUESTED、AI_HINT_SHOWN、AI_OBSERVATION_ASSISTED、AI_REVIEW_GENERATED、RUN_COMPLETED。

`JUMPED_TO` 表示学生通过事件轨迹直接跳转到某个已进入过的历史节点，payload MUST 含 `from`（当前节点）与 `to`（目标节点）；与 STEPPED_BACK 一样为追加式导航事实，MUST NOT 修改既有事件或回滚变量/分数。

#### Scenario: 每种事件类型可构造且可序列化
- **WHEN** 构造 16 种事件类型各一个实例并 JSON 序列化
- **THEN** 反序列化后字段完整，无丢失

#### Scenario: 回退事件记录事实
- **WHEN** 学生从节点 B 回退到节点 A
- **THEN** 追加一条 STEPPED_BACK 事件，payload 含 from（B）与 to（A），既有事件不被修改或删除

#### Scenario: 跳转事件记录
- **WHEN** 学生从节点 D 通过轨迹跳转到历史节点 B
- **THEN** 追加一条 JUMPED_TO 事件，payload 含 from（D）与 to（B），既有事件不被修改或删除
