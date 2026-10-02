# Tasks

## 1. Provider 健壮性

- [x] 1.1 新增 `AiOutputParseError`；截断（finish_reason=length）与 JSON 解析失败统一归为该类
- [x] 1.2 结构化/文本请求默认 `max_tokens=8192`

## 2. Repair 循环覆盖解析失败

- [x] 2.1 `AiService.propose` 捕获 `AiOutputParseError` → 合成 SCHEMA_INVALID issue 回喂下一轮
- [x] 2.2 多轮仍无法解析 → 502 BadGateway + 可读原因（不再返回空提案）
- [x] 2.3 单测：首轮解析失败后修复成功；持续解析失败抛 502

## 3. 生成约束强化

- [x] 3.1 Capability Registry 各节点 aiAuthoringHint 声明 config 必填字段

## 4. 验收

- [x] 4.1 全量 vitest + tsc + biome 通过
- [x] 4.2 真实 DeepSeek 联调：同一意图一次通过校验（needsReview=false，0 error）
