# Proposal: phase6-teacher-ai-copilot

## Why

Iteration 1 的第四个验证点是「AI 能生成符合结构约束的 Experiment Definition」。Phase 5 的教师端只有 AI 占位按钮，教师仍需手写或手工编辑全部内容。架构文档（docs/architecture/ai-provider.md）已定义完整的 AI 生成流程与权限边界，本阶段把 Teacher Copilot 落地：AI 生成 → 三层校验 → Repair Loop → 教师确认，全程不绕过 Validator、不直接发布。

## What Changes

- API 新增 `ai` 模块：AIProvider 接口隔离供应商；OpenAI 兼容 Provider（OpenAI/DeepSeek 等同一协议，base URL/key/model 走环境变量）+ Mock Provider（离线开发/测试默认）
- 教师端点（需认证）：
  - `POST /api/experiments/:id/ai/generate`：自然语言意图 → 完整 Definition 草案提案
  - `POST /api/experiments/:id/ai/change`：当前草稿 + 修改指令 → Change Proposal（新 Definition + 变更摘要）
  - 两个端点都执行三层 Validator 校验，失败时把问题列表回喂给 Provider 做有界 Repair（最多 2 轮）
  - 提案只在内存中返回，绝不落库、绝不发布；教师确认后走既有草稿更新/发布链路
- Studio：AI Copilot 面板替换占位按钮——意图输入、生成/修改、提案摘要与校验问题展示、确认应用（写入编辑器草稿态，标 dirty）或丢弃；试玩可直接跑提案内容
- Capability Registry 作为 Prompt 上下文与生成约束的唯一来源（节点/变量/操作符/效果白名单）

## Capabilities

### New Capabilities
- `teacher-ai-copilot`: AI 生成/修改实验草案、Change Proposal、校验与 Repair Loop、Provider 隔离

### Modified Capabilities
- `teacher-studio`: AI Copilot 入口从占位升级为真实功能（确认应用/丢弃交互）

## Impact

- `apps/api`：新增 ai 模块（Provider 接口 + 两个实现 + 两个端点 + Repair Loop）；无数据库变更
- `apps/studio`：Copilot 面板 UI 与提案应用逻辑
- 环境变量：`AI_PROVIDER`（mock/openai-compatible，默认 mock）、`AI_BASE_URL`、`AI_API_KEY`、`AI_MODEL`
- 明确不做：Student AI（Briefing/Tutor/观察助手/Review 属后续阶段）、AI 生成资源文件（只生成 assetId 引用）、生成结果直接落库或发布、流式输出
