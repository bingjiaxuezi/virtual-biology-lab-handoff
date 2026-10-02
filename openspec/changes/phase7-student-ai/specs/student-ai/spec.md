# Spec Delta

## Purpose

为学生提供四种 AI 辅助能力：实验导读、Tutor 提示、观察完善建议、实验后复盘。Student AI 对 Runtime 只读：只能读取 Definition/State/Events/Current Node/Observation/AI Policy，绝不能替学生执行命令、提交答案或修改实验状态。

## ADDED Requirements

### Requirement: 实验导读
系统 MUST 提供实验导读端点：基于已发布版本的 Definition（教学目标/变量/流程概览）生成导读文本；生成时 MUST 落库 AI_BRIEFING_VIEWED 事件。

#### Scenario: 学生查看导读
- **WHEN** 学生在 START 节点请求实验导读
- **THEN** 返回导读文本，事件流中出现 AI_BRIEFING_VIEWED

### Requirement: Tutor 提示
系统 MUST 提供 Tutor 提示端点：上下文为当前节点、当前状态与近期事件；提示深度 MUST 受 aiPolicy.tutor.hintLevel 控制；系统 MUST NOT 在提示中直接给出 QUESTION 节点的答案（revealAnswer 恒为 false）；每次请求 MUST 依次落库 AI_HINT_REQUESTED 与 AI_HINT_SHOWN 事件。

#### Scenario: 提示深度受策略控制
- **WHEN** 学生在 hintLevel=LIGHT 的实验中请求提示
- **THEN** 返回只引导方向、不解释原理的提示文本

#### Scenario: 不泄露答案
- **WHEN** 学生在 QUESTION 节点请求提示
- **THEN** 返回引导性内容，不包含选项答案本身

### Requirement: 观察完善建议
系统 MUST 提供观察助手端点：输入学生的观察草稿文本，返回完善建议；端点 MUST NOT 改变 Run 状态、MUST NOT 提交观察；采纳后的提交 MUST 仍由学生通过既有 SUBMIT_OBSERVATION 命令完成；生成时 MUST 落库 AI_OBSERVATION_ASSISTED 事件。

#### Scenario: 建议不改变运行状态
- **WHEN** 学生请求观察完善建议
- **THEN** 返回建议文本，Run 的 currentNodeId/state 不变，无 OBSERVATION_SUBMITTED 事件产生

### Requirement: 实验后复盘
系统 MUST 提供复盘端点：仅当 Run 为 COMPLETED 时可用，否则返回 409（AI_REVIEW_NOT_READY）；复盘 MUST 基于完整事件流与得分生成；生成时 MUST 落库 AI_REVIEW_GENERATED 事件。

#### Scenario: 未完成不可复盘
- **WHEN** 学生对 RUNNING 状态的 Run 请求复盘
- **THEN** 返回 409 AI_REVIEW_NOT_READY

#### Scenario: 完成后生成复盘
- **WHEN** 学生对已完成的 Run 请求复盘
- **THEN** 返回复盘文本，事件流末尾出现 AI_REVIEW_GENERATED

### Requirement: AI Policy 门控
各 AI 端点 MUST 检查该 Run 固定版本 Definition 的 aiPolicy 对应开关；功能 disabled 时 MUST 返回 403（AI_FEATURE_DISABLED）且不产生任何 Provider 调用或事件。

#### Scenario: 功能关闭时拒绝
- **WHEN** 学生在 tutor.enabled=false 的实验中请求提示
- **THEN** 返回 403 AI_FEATURE_DISABLED，事件数不变

### Requirement: AI 事件共用序列化追加
AI 事件 MUST 与学生命令事件共用同一 (runId, sequence) 序列：追加在事务内完成，sequence 自 lastSequence 连续递增并同步更新 Run；轨迹 MUST 保持严格单调。

#### Scenario: AI 事件与学生事件同序
- **WHEN** 学生在两次命令之间请求一次提示
- **THEN** AI_HINT_REQUESTED/AI_HINT_SHOWN 按 sequence 插入事件流，无重复无跳号

### Requirement: Student AI 只读约束
AI 端点 MUST NOT 调用 Runtime 的任何命令入口；除 AI 事件落库与 lastSequence 同步外，MUST NOT 修改 Run 的状态字段（status/currentNodeId/state）。

#### Scenario: 提示后状态不变
- **WHEN** 学生连续请求导读、提示、观察建议
- **THEN** Run 的 status/currentNodeId/state 与请求前完全一致
