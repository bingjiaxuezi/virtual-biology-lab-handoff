# Delta for student-ai

## ADDED Requirements

### Requirement: AI 调用配额
学生 AI 端点保持公开（与学生 runs 端点一致），因此系统 MUST 对每个 Run 按功能限制 AI 调用次数：briefing ≤ 5、hint ≤ 20、observation-assist ≤ 20、review ≤ 5。达到上限时 MUST 返回 429 `AI_RATE_LIMITED`，且 MUST NOT 调用 Provider、MUST NOT 写入事件。配额统计 SHALL 以已落库的 AI 事件数为准。

#### Scenario: 达到上限被拒
- **WHEN** 某 Run 的 hint 已调用 20 次，学生再次请求提示
- **THEN** 返回 429 `AI_RATE_LIMITED`，Provider 未被调用，事件序列不变

#### Scenario: 配额内正常服务
- **WHEN** 某 Run 的 hint 已调用次数低于上限且功能开启
- **THEN** 正常生成提示并按既有规则落库 AI 事件
