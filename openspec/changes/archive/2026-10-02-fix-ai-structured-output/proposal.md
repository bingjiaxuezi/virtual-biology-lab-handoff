# 修复 AI 结构化生成的健壮性

## 背景

接入真实 Provider（DeepSeek，OpenAI 兼容协议）后，教师端 AI 生成接口返回 500。根因有二：

1. **输出截断**：Provider 未设置 `max_tokens`，DeepSeek 默认上限 4096 token，完整 Experiment Definition 普遍超出，返回的 JSON 被截断，`JSON.parse` 抛错直接 500。
2. **解析失败未纳入修复循环**：校验失败（Validator issues）会回喂修复，但「根本不是合法 JSON」这类失败发生在校验之前，直接冒泡为 500，绕过了 Repair 机制。

同时发现 DeepSeek 容易漏掉节点 config 的必填字段（如 QUESTION 缺 `prompt`），因为 Capability Registry 的 `aiAuthoringHint` 只描述用途、未声明必填字段。

## 变更

- `OpenAICompatibleProvider`：默认 `max_tokens=8192`；检测 `finish_reason=length` 与 JSON 解析失败，统一抛出 `AiOutputParseError`。
- `AiService.propose`：将 `AiOutputParseError` 视为可修复的校验失败（合成 `SCHEMA_INVALID` issue 回喂），计入既有有界 Repair；多轮均无法解析时返回 502 与可读原因，不再返回空提案。
- Capability Registry：`aiAuthoringHint` 补充各节点 config 的必填字段（保持注册表作为 AI 生成约束的单一事实来源）。

## 影响

- 规格：`teacher-ai-copilot`（Repair 语义扩展）、`capability-registry`（aiAuthoringHint 内容要求）。
- 无 schema、无 API 契约变化；MockProvider 行为不变。
