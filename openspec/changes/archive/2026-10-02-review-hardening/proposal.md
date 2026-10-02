# Review 加固：AI 配额、Provider 超时与前端残留修复

## Why

接入真实 Provider（DeepSeek）后，一轮代码审查发现以下问题：

1. **Student AI 端点公开且无配额**：任何持有 runId 的人可无限调用 hint/briefing 等端点，每次调用真实消耗 API 额度，存在被刷量的成本风险。
2. **Provider 请求无超时**：DeepSeek 挂起时 HTTP 请求无限悬挂，教师端/学生端界面长时间无响应。
3. **AI 助教回复残留**：切换节点后上一条 AI 回复仍显示，且无类型标识，容易误导学生。
4. **观察建议框在提交后仍可交互**：提交完成后「采纳到输入框」仍可见但输入框已禁用，状态不一致。
5. **dispatch 文本无长度上限**：观察/答案文本未限制长度，与 observation-assist 的 4000 字符上限不一致。

## What Changes

- Student AI：每个 Run 按功能设调用上限（briefing 5 / hint 20 / observation-assist 20 / review 5），超限返回 429 `AI_RATE_LIMITED`，不调 Provider、不记事件。
- OpenAICompatibleProvider：请求加 120s 超时，超时返回可读错误。
- 学生端 AiAssistant：节点/状态切换时清空旧回复；回复带类型标签（导读/提示/复盘）；处理 429 提示。
- ObservationNodeView：提交完成后隐藏建议面板。
- Runs dispatch：SUBMIT_OBSERVATION 文本上限 4000、ANSWER_QUESTION 上限 2000。

## 影响

- 规格：`student-ai` 新增配额要求；其余为不破坏契约的实现加固。
- 无 schema、无持久化结构变化。
