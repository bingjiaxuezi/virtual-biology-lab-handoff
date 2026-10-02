# Tasks

## 1. Provider 文本生成（API）

- [x] 1.1 AIProvider 增加 generateText；OpenAICompatibleProvider 实现（纯文本 chat completion）
- [x] 1.2 MockProvider 实现 generateText：按 usage 返回确定性中文文案（含上下文关键词）

## 2. Student AI 端点（API）

- [x] 2.1 只读上下文构建器：Run 快照 + 固定版本 Definition + 近期事件（上限 20 条）
- [x] 2.2 AI 事件追加器：事务内 sequence 连续分配 + lastSequence 同步（复用 (runId,sequence) 约束）
- [x] 2.3 `POST /api/runs/:runId/ai/briefing`：Definition 概览 → 导读文本 + AI_BRIEFING_VIEWED
- [x] 2.4 `POST /api/runs/:runId/ai/hint`：hintLevel 写入 prompt、revealAnswer=false 硬约束、双事件落库
- [x] 2.5 `POST /api/runs/:runId/ai/observation-assist`：观察草稿 → 建议文本（零状态变更）
- [x] 2.6 `POST /api/runs/:runId/ai/review`：仅 COMPLETED，完整事件流 → 复盘文本
- [x] 2.7 aiPolicy 门控：disabled → 403 AI_FEATURE_DISABLED（不调 Provider、不记事件）
- [x] 2.8 单测：门控、只读约束（状态不变）、事件序列连续、review 状态门槛、hint 上下文包含当前节点

## 3. 学生端 UI

- [x] 3.1 API 客户端补充四个 AI 方法 + 错误码处理（403/409 友好提示）
- [x] 3.2 START 节点「实验导读」弹层；各节点「求助 AI」内联展示区
- [x] 3.3 OBSERVATION 节点「AI 完善建议」+ 采纳填框（不自动提交）
- [x] 3.4 完成后「生成复盘」入口 + 复盘展示
- [x] 3.5 入口随 aiPolicy 显隐

## 4. 测试与验收

- [x] 4.1 学生端组件测试：入口显隐、提示展示、采纳不提交、复盘展示
- [x] 4.2 集成测试（真实库）：命令与 AI 事件混合序列单调、教师轨迹可见 AI 事件
- [x] 4.3 全量 vitest + tsc + biome + `openspec validate phase7-student-ai` 通过
- [x] 4.4 手动联调记录：mock 模式完整跑「导读 → 设变量 → 求助 → 观察建议采纳 → 提交 → 复盘」，教师端轨迹确认 AI 事件可见
