# run-orchestration Specification

## Purpose

把学生实验运行变成可持久化、可恢复、可复盘的服务：Run 从固定版本创建，命令经统一 Runtime 原子执行，状态与事件落库，教师可查看完整轨迹。

## Requirements

### Requirement: 从固定版本创建 Run
系统 MUST 只能从已发布的 ExperimentVersion 创建 Run；Run MUST 持久化绑定 experimentVersionId 与 studentId，创建后绑定关系不可变。

#### Scenario: 未发布实验不可运行
- **WHEN** 用不存在或未发布的版本 id 创建 Run
- **THEN** 创建失败并说明原因

### Requirement: 命令经统一 Runtime 执行
API 接收的学生命令 MUST 交给 Phase 2 统一 Runtime 执行（加载快照→恢复→dispatch→持久化新事件与新快照）；命令被拒绝时 MUST 返回原因且不写入任何事件或状态变更。

#### Scenario: 非法命令零副作用
- **WHEN** 学生发送越界 SET_VARIABLE
- **THEN** 返回拒绝原因，数据库中事件数与 Run 状态不变

#### Scenario: 服务重启后继续运行
- **WHEN** 服务重启后学生对进行中的 Run 发送 ADVANCE
- **THEN** Runtime 从最近快照恢复并正确推进，事件 sequence 衔接

### Requirement: Run 状态与事件轨迹可查询
系统 MUST 提供查询：Run 当前状态（status/currentNodeId/state/score）与按 sequence 有序的完整事件流。

#### Scenario: 教师查看轨迹
- **WHEN** 教师请求某 Run 的事件流
- **THEN** 返回该 Run 全部事件，sequence 从 1 单调递增

### Requirement: 运行并发安全
同一 Run 的并发命令 MUST 串行生效：sequence 分配 MUST 在数据库事务内完成并以 (runId, sequence) 唯一约束兜底，冲突时重试或拒绝而非产生乱序。

#### Scenario: 并发命令不产生重复 sequence
- **WHEN** 两个命令同时到达同一 Run
- **THEN** 数据库中不存在重复 (runId, sequence)，事件流仍严格单调
