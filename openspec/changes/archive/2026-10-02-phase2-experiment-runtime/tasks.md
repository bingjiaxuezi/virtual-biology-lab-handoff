# Tasks

## 1. experiment-events 包

- [x] 1.1 建包骨架（package.json/tsconfig，依赖 experiment-schema）
- [x] 1.2 定义 14 种核心事件类型与 Event 字段模型（eventId/runId/sequence/type/nodeId?/payload/timestamp/stateBefore?/stateAfter?）
- [x] 1.3 定义 `EventLog` 接口（append 分配 sequence、getByRun）
- [x] 1.4 实现 `InMemoryEventLog`（append-only、sequence 连续校验、按 Run 有序读取）
- [x] 1.5 测试：14 种事件构造序列化、append-only 无改删接口、顺序追加、乱序拒绝、多 Run 隔离读取

## 2. Runtime 编译与状态

- [x] 2.1 建包骨架（依赖 schema/registry/validator/events + xstate）
- [x] 2.2 初始 State 构建：变量 defaultValue + assessment.initialScore
- [x] 2.3 条件求值纯函数（复用 Phase 1 类型兼容表，EQ/NEQ/GT/LT/GTE/LTE）
- [x] 2.4 规则求值纯函数 `evaluateRules`（单遍、SET/ADD/SUBTRACT/SCORE、返回新 State + 已触发规则）
- [x] 2.5 Definition → XState v5 machine 编译（节点→state、Transition→guard edge、priority→guard 顺序）

## 3. 命令管线与生命周期

- [x] 3.1 Run 模型（runId/experimentVersionId/studentId/status/currentNodeId/state/score/时间戳），启动前 Validator 校验，非法拒绝启动
- [x] 3.2 命令白名单与参数校验（SET_VARIABLE 类型与 min/max/options 校验）
- [x] 3.3 dispatch 管线：校验→应用→规则→（ADVANCE）选边→写事件，失败原子拒绝
- [x] 3.4 事件产出：RUN_STARTED/NODE_ENTERED/VARIABLE_CHANGED/RULE_APPLIED/TRANSITION_TAKEN/OBSERVATION_SUBMITTED/QUESTION_ANSWERED/ACTION_PERFORMED/RUN_COMPLETED
- [x] 3.5 到达 END 置 COMPLETED；ABORTED 支持

## 4. 快照与 AI 边界

- [x] 4.1 快照导出/恢复（status/currentNodeId/state/score/lastSequence，machine 重建式恢复）
- [x] 4.2 AI 事件追加接口（只写 Log、不改 State）

## 5. 端到端测试与验收

- [x] 5.1 样板实验高温路径：80℃ → DENATURED 分支、规则生效、score 变化、事件轨迹完整、sequence 单调
- [x] 5.2 样板实验正常路径：37℃ → NORMAL 分支
- [x] 5.3 同一 Runtime 运行第二个合法 Definition（验证无实验硬编码）
- [x] 5.4 非法 Definition 拒绝启动；未知命令/越界赋值原子拒绝
- [x] 5.5 快照恢复后与连续执行行为一致
- [x] 5.6 AI 事件不改变 Run State
- [x] 5.7 全量 vitest + tsc + biome 通过，`openspec validate phase2-experiment-runtime` 通过
