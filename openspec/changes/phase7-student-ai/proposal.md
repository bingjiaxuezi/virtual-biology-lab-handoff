# Proposal: phase7-student-ai

## Why

Iteration 1 学生侧的四项 AI 能力（Briefing / Tutor / 观察助手 / Review）是产品体验的最后一块拼图。地基已备好：AIProvider 接口（Phase 6）、五种 AI 事件类型（Phase 2）、AI Policy 配置（Definition v0.1）、recordAIEvent 语义。本阶段把它们接起来，同时守住硬约束：Student AI 对 Runtime 只读，绝不替学生执行操作。

## What Changes

- API 新增 Student AI 端点（学生公开，与 runs 端点一致）：
  - `POST /api/runs/:runId/ai/briefing`：实验导读（START 阶段）
  - `POST /api/runs/:runId/ai/hint`：Tutor 提示（当前节点 + 状态 + 近期事件为上下文，深度受 hintLevel 控制）
  - `POST /api/runs/:runId/ai/observation-assist`：对学生观察草稿给完善建议（绝不代提交）
  - `POST /api/runs/:runId/ai/review`：实验后复盘（仅 COMPLETED 状态，消费完整事件流）
- AI Policy 门控：功能在 Definition 中 disabled 时端点返回 403（AI_FEATURE_DISABLED），前端对应入口不渲染
- AI 事件落库：AI_BRIEFING_VIEWED / AI_HINT_REQUESTED / AI_HINT_SHOWN / AI_OBSERVATION_ASSISTED / AI_REVIEW_GENERATED，与学生命令事件共用 (runId, sequence) 序列化事务，保证轨迹完整单调
- AIProvider 接口扩展文本生成方法；Mock Provider 提供确定性中文文案（离线可用）
- 学生端 UI：导读按钮（START）、求助 AI（各节点）、观察完善建议（OBSERVATION，采纳只填充文本框）、生成复盘（完成后）

## Capabilities

### New Capabilities
- `student-ai`: 学生侧四种 AI 能力、AI Policy 门控、只读上下文、AI 事件落库

### Modified Capabilities
- `run-orchestration`: AI 事件与学生命令事件共用序列化追加机制
- `student-runtime-ui`: 四种 AI 入口的渲染与门控

## Impact

- `apps/api`：新增 student-ai 模块（上下文构建 + 四个端点 + 事件追加）；无数据库结构变更
- `apps/web`：RunPage 增加 AI 区块与复盘页入口
- 复用 `AI_PROVIDER` 环境变量配置（默认 mock）
- 明确不做：流式输出、AI 用量配额/计费、Tutor 多轮对话（单轮请求-响应）、学生侧认证
