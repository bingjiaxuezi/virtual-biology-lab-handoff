# Delta for teacher-ai-copilot

## MODIFIED Requirements

### Requirement: 校验失败的有界 Repair
AI 输出 MUST 经过与手写内容相同的三层 Validator；存在 error 时系统 SHALL 把问题列表（code/path/message）回喂 Provider 要求修复，最多 2 轮；仍有 error 时 MUST 返回提案与剩余问题并标记 needsReview，由教师在编辑器中修复。

结构化输出在进入校验前的解析失败（JSON 截断、非 JSON）MUST 同样计入修复轮次：系统 SHALL 合成 `SCHEMA_INVALID` 问题回喂 Provider；多轮均无法解析时 MUST 返回 502 与可读原因，MUST NOT 返回空提案。Provider 层 SHALL 为结构化请求设置足够的输出上限（默认 8192 tokens）以避免截断。

#### Scenario: 一轮修复成功
- **WHEN** AI 首次输出引用了未注册的操作符，修复后合法
- **THEN** 返回修复后的草案，issues 为空

#### Scenario: 输出截断后修复成功
- **WHEN** AI 首轮输出的 JSON 因达到 token 上限被截断
- **THEN** 系统将截断问题回喂 Provider 重新生成，修复后返回合法草案

#### Scenario: 修复不绕过校验
- **WHEN** 2 轮修复后仍有 error
- **THEN** 响应标记 needsReview 并附完整问题列表，教师可查看但应用时仍需通过保存校验

#### Scenario: 持续输出非法 JSON
- **WHEN** 全部生成轮次的输出都无法解析为 JSON
- **THEN** 返回 502 与可读原因，不产生任何提案落库
