# Delta for experiment-runtime

## MODIFIED Requirements

### Requirement: 规则与条件求值
变量变化后 Runtime MUST 求值 Rule：仅对 `when` 条件引用的变量发生变化的 Rule 求值（其余 Rule 跳过，避免无关变量变化导致效果与计分被重复应用）；命中的 Rule 按 effects 更新 State（SET/ADD/SUBTRACT 作用于变量，SCORE 作用于总分），并记录 RULE_APPLIED 事件；求值 MUST 类型安全（BOOLEAN 不参与大小比较）。**SCORE 效果 MUST 幂等：每条 Rule 的 SCORE 效果在同一 Run 内至多生效一次**；SET/ADD/SUBTRACT 效果不受此限。

#### Scenario: 高温规则生效
- **WHEN** 样板实验中 temperature 设为 80
- **THEN** sampleStatus 变为 DENATURED、score 增加对应分值，并产生 RULE_APPLIED 事件

#### Scenario: 无关变量变化不重复触发规则
- **WHEN** grip_site 已置为正确选项（命中 +10 规则）后，又对另一个变量 dissect_tools 执行 SET_VARIABLE
- **THEN** grip_site 的规则不再生效，score 不因 dissect_tools 的变化而重复增加

#### Scenario: 同一变量再次变化仍触发
- **WHEN** 学生对同一变量先选错（未命中）再改选对
- **THEN** 改对的那次 SET_VARIABLE 触发规则并计分一次

#### Scenario: 回退重答不刷分
- **WHEN** 学生答对某计分选择后回退到该选择点并再次提交正确答案
- **THEN** 该 Rule 的 SCORE 效果不再生效，score 保持不变

## ADDED Requirements

### Requirement: 回退命令（BACK）
Runtime MUST 支持 `BACK` 命令：将当前节点指针移回上一个访问的节点并追加 `STEPPED_BACK` 事件；BACK MUST NOT 回滚变量、分数或删除任何事件。历史为空或 Run 已结束（COMPLETED/ABORTED）时 BACK MUST 被拒绝并返回原因。

#### Scenario: 正常回退
- **WHEN** 学生从节点 B 发出 BACK，且访问历史为 [start, A, B]
- **THEN** 当前节点变为 A，追加 STEPPED_BACK（from B, to A），变量与分数不变

#### Scenario: 起点不可回退
- **WHEN** 学生在 START 后的第一个节点之前发出 BACK
- **THEN** 命令被拒绝并返回原因

#### Scenario: 已完成的 Run 不可回退
- **WHEN** Run 已 COMPLETED，学生发出 BACK
- **THEN** 命令被拒绝并返回原因
