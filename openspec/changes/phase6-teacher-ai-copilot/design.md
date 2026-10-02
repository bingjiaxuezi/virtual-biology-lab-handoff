# Design

## Context

架构决策已在 docs/architecture/ai-provider.md 定稿：Provider 接口隔离、Capability Registry 作为生成约束、Validator 不可绕过、Teacher AI 只产出 Draft/Change Proposal。本阶段按该文档实现 Teacher 侧最小闭环。约束：供应商密钥只在服务端；离线开发必须可用（Mock Provider）；AI 输出不可信，必须经过与手写内容完全相同的校验管线。

## Goals / Non-Goals

**Goals:**
- AIProvider 接口 + OpenAI 兼容实现 + Mock 实现
- 生成与修改两个教师端点，含三层校验与有界 Repair
- Studio Copilot 面板：提案审阅 → 确认应用/丢弃

**Non-Goals:**
- Student AI 四种 Usage、流式输出、多 Provider 路由表（YAML）、生成用量审计落库
- AI 直接编辑 React Flow 图或操作编辑器内部状态

## Decisions

### Provider：一个 OpenAI 兼容实现覆盖多家供应商
OpenAI、DeepSeek、通义等都提供 OpenAI 兼容的 chat/completions 协议。实现单个 `OpenAICompatibleProvider`，用 `AI_BASE_URL`/`AI_API_KEY`/`AI_MODEL` 指向任意兼容端点；接口签名按架构文档的 `generateStructured`（JSON 模式/结构化输出）。`AI_PROVIDER=mock` 时用确定性 Mock（内置一份合法的酶温度类 Definition 模板，按指令做规则化改写），开发与 CI 默认零外网依赖。
理由：不为每家供应商写 Adapter；迭代 1 只需要「结构化生成可用 + 可替换」。

### 提案不落库：应用 = 走既有草稿更新
端点返回 `{ definition, summary, issues }`，教师确认后由 Studio 把 definition 写入编辑器草稿态（标 dirty），保存走既有 `PUT /experiments/:id`（含服务端校验）。AI 没有任何专用写入通道。
理由：草稿/发布链路是唯一的持久化入口，AI 也不例外；天然满足「不能直接发布」。

### Repair Loop：最多 2 轮，把稳定错误码回喂
生成 → validateExperiment → 若有 error，把 issues（code/path/message）与原输出一起回喂 Provider 要求修复 → 再校验。2 轮后仍有 error 则把提案和剩余 issues 一起返回给教师（标记 needsReview），由人在编辑器里修。
理由：Validator 的错误码就是为 AI Repair 设计的（见 validator errors.ts 注释）；有界循环避免烧钱死循环。

### Capability Registry 进 Prompt：白名单 + authoring hint
Prompt 上下文包含：节点/变量/操作符/效果的 type + description + aiAuthoringHint、Experiment Schema 的字段要求、当前草稿（change 场景）、教师意图。能力校验层（validateCapabilities）已在 Validator 中，未注册的类型必然被拦。
理由：单一约束来源；新增能力时 Registry 更新即同时更新 Prompt 与校验。

### Change Proposal 的 diff 摘要由服务端生成
change 端点对比新旧 Definition，生成人类可读摘要（新增/删除/修改的节点、变量、规则计数 + 关键变化列表），教师先看摘要再决定应用。
理由：整份 JSON 直接替换风险高，摘要是教师确认的依据；摘要在服务端生成，不信任 AI 自述。
