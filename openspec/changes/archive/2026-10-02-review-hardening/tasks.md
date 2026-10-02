# Tasks

## 1. Student AI 配额（API）

- [x] 1.1 按功能统计已落库 AI 事件数，超限抛 429 AI_RATE_LIMITED（先于 Provider 调用）
- [x] 1.2 单测：达到上限 → 429，不调 Provider、不记事件

## 2. Provider 健壮性

- [x] 2.1 请求增加 120s AbortSignal 超时，超时映射为可读错误

## 3. 学生端修复

- [x] 3.1 AiAssistant：节点/状态切换清空旧回复 + 回复类型标签 + 429 友好提示
- [x] 3.2 ObservationNodeView：提交完成后隐藏建议面板

## 4. 输入加固（API）

- [x] 4.1 dispatch：SUBMIT_OBSERVATION ≤4000、ANSWER_QUESTION ≤2000

## 5. 验收

- [x] 5.1 全量 vitest + tsc + biome + openspec validate 通过
