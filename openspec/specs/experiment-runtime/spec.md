# experiment-runtime Specification

## Purpose

提供统一实验运行时：任何通过校验的 Experiment Definition 都能被同一个 Runtime 执行，学生操作以命令进入、世界状态以规则演进、流程以 Transition 推进、全程产出 Event 与可恢复快照。

## Requirements

### Requirement: Definition 驱动的统一执行
Runtime MUST 仅从 Experiment Definition（固定 Version）驱动执行，MUST NOT 包含任何按具体实验硬编码的逻辑；执行前 MUST 通过 Phase 1 Validator 校验，非法 Definition MUST 拒绝启动。

#### Scenario: 同一 Runtime 运行不同 Definition
- **WHEN** 用同一 Runtime 实例分别运行样板实验与另一个合法 Definition
- **THEN** 两者都能启动并正确推进，无需修改 Runtime 代码

#### Scenario: 非法 Definition 拒绝启动
- **WHEN** 用校验失败的 Definition 创建 Run
- **THEN** 启动失败并返回校验错误，不产生任何事件

### Requirement: Run 生命周期
Run 状态 MUST 为 CREATED、RUNNING、COMPLETED、ABORTED 之一；Run MUST 绑定固定 Experiment Version 与 studentId；到达 END 节点时状态变为 COMPLETED 并记录 RUN_COMPLETED。

#### Scenario: 完整生命周期
- **WHEN** 创建 Run、开始、逐步执行至 END
- **THEN** 状态依次经过 CREATED、RUNNING、COMPLETED

#### Scenario: Run 绑定版本
- **WHEN** 读取任意 Run
- **THEN** 其 experimentVersionId 非空且创建后不可变

### Requirement: 初始状态来自 Definition
Run 初始 State MUST 由各变量 defaultValue 与 assessment.initialScore 构成，不依赖外部输入。

#### Scenario: 初始状态正确
- **WHEN** 用样板实验启动 Run
- **THEN** state 中 temperature=25、sampleStatus=NORMAL、score=0

### Requirement: 学生命令白名单
Runtime MUST 只接受白名单命令：SET_VARIABLE、PERFORM_ACTION、SUBMIT_OBSERVATION、ANSWER_QUESTION、ADVANCE；未知命令 MUST 被拒绝且不改变状态、不产生事件。

#### Scenario: 未知命令被拒绝
- **WHEN** 发送白名单之外的命令
- **THEN** 命令被拒绝，Run 状态与事件流不变

#### Scenario: 越界变量赋值被拒绝
- **WHEN** 对 temperature 执行 SET_VARIABLE 赋值 120（超出 max 100）
- **THEN** 命令被拒绝并返回原因

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

### Requirement: 流程跳转由 Transition 决定
进入节点后 Runtime MUST 在出边 Transition 中选择：先过滤 condition 满足的边（无条件边视为满足），再按 priority 降序取第一条；选择结果记录 TRANSITION_TAKEN 事件；流程逻辑 MUST NOT 出现在 Rule 中。

#### Scenario: 条件分支
- **WHEN** 样板实验 temperature=80 时在 check_temp 节点推进
- **THEN** 选择通往 denatured_media 的 Transition

#### Scenario: 优先级决胜
- **WHEN** 多条出边条件同时满足
- **THEN** 选择 priority 最高的边

### Requirement: 事件完整记录
Runtime MUST 在关键动作产生对应 Event：启动 RUN_STARTED、进节点 NODE_ENTERED、变量变化 VARIABLE_CHANGED、规则生效 RULE_APPLIED、跳转 TRANSITION_TAKEN、观察提交 OBSERVATION_SUBMITTED、完成 RUN_COMPLETED；Event 写入 append-only Event Log。

#### Scenario: 样板实验事件轨迹
- **WHEN** 学生以 temperature=80 完成样板实验
- **THEN** 事件流包含 RUN_STARTED、VARIABLE_CHANGED、RULE_APPLIED、TRANSITION_TAKEN（高温分支）、OBSERVATION_SUBMITTED、RUN_COMPLETED，且 sequence 单调递增

### Requirement: 快照与恢复
Runtime MUST 能导出当前 Run 快照（状态、当前节点、事件序号水位），并 MUST 能从快照恢复到完全一致的状态继续执行；快照是性能优化，Event Log 仍是事实源。

#### Scenario: 快照恢复一致
- **WHEN** 执行若干步后导出快照、从快照重建 Runtime 并继续执行
- **THEN** 后续行为与未中断执行完全一致，事件 sequence 衔接

### Requirement: AI 只读边界
Runtime MUST NOT 提供任何供 AI 写入的接口；AI 提示类事件（AI_HINT_REQUESTED 等）只能作为外部事实追加记录，不触发状态变化。

#### Scenario: AI 事件不改状态
- **WHEN** 追加一条 AI_HINT_SHOWN 事件
- **THEN** Run State 与当前节点不变

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
