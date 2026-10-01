# Runtime / Run / Event 模型

## Runtime 输入

- Experiment Definition（固定 Version）
- Initial State
- Student Identity
- Runtime Policy

## Runtime 职责

- 加载 Definition
- 调用 Validator/Compiler
- 建立 XState Runtime
- 渲染当前 Node
- 接收合法 Student Command
- 更新 State
- 记录 Event
- 保存 Snapshot

## Run Status

Iteration 1 建议：

- CREATED
- RUNNING
- COMPLETED
- ABORTED

## 核心 Event Types

- RUN_STARTED
- NODE_ENTERED
- ACTION_PERFORMED
- VARIABLE_CHANGED
- OBSERVATION_SUBMITTED
- QUESTION_ANSWERED
- RULE_APPLIED
- TRANSITION_TAKEN
- AI_BRIEFING_VIEWED
- AI_HINT_REQUESTED
- AI_HINT_SHOWN
- AI_OBSERVATION_ASSISTED
- AI_REVIEW_GENERATED
- RUN_COMPLETED

## Event 原则

- Event append-only
- 同一 Run 内 sequence 单调递增
- 不通过修改历史 Event 修正状态
- 必要时使用补偿/纠正 Event

## AI 上下文

Student Tutor Context Builder 从以下来源构建上下文：

```text
Definition
+ Current Node
+ Current State
+ 最近 N 条 Events / 摘要
+ Student Observation
+ AI Policy
```

不要把完整无限历史无脑塞给模型；后续可引入摘要策略。
