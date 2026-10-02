# Design

## Context

Student AI 的权限边界在 docs/architecture/ai-provider.md 与 AGENTS.md 中已钉死：只读上下文（Definition/State/Events/Current Node/Observation/AI Policy），不得拥有 Experiment Command API，revealAnswer 固定 false。Provider 层（Phase 6）已就绪，AI 事件类型（Phase 2）已定义。本阶段的关键设计点是：事件如何与学生命令事件共用序列化机制、上下文怎么拼、UI 入口的门控逻辑。

## Goals / Non-Goals

**Goals:**
- 四个学生 AI 端点 + AI Policy 门控
- AI 事件与学生命令事件同一序列（sequence 严格单调）
- 学生端四个入口，采纳建议不自动提交

**Non-Goals:**
- 流式输出、多轮对话、配额计费、学生认证
- Tutor 主动介入（只在学生点击时响应）

## Decisions

### Provider 接口扩展 generateText
四种 Usage 输出都是自然语言文本而非 JSON，为 `AIProvider` 增加 `generateText(request): Promise<string>`。OpenAI 兼容实现走同一 chat/completions（不带 response_format）；Mock 按 Usage 返回确定性中文文案（引用当前节点类型与变量快照，便于测试断言）。
理由：与 generateStructured 并列的最小扩展，不引入第三种抽象。

### AI 事件追加：复用 (runId, sequence) 序列化事务
AI 事件不改变 Run State，只追加事件。实现为单事务：读 Run 拿 lastSequence → 插入 sequence = lastSequence+1（hint 场景两条事件连号）→ 更新 run.lastSequence。与学生命令共用 (runId, sequence) 唯一约束兜底，轨迹对教师/复盘完全可见。
理由：教师轨迹与 AI Review 都依赖完整事件流；AI 事件游离在序列外会破坏「Event Log 是事实记录」的架构约束。

### 上下文构建器：按 Usage 裁剪只读上下文
统一 `buildStudentContext(runId)`：Run 快照 + 固定版本 Definition + 最近 20 条事件。各 Usage 再裁剪：briefing 只用 Definition（教学意图/变量/流程概览）；tutor 用当前节点 + 状态 + 近期事件 + aiPolicy.tutor 约束（hintLevel 写入 prompt：LIGHT 只给方向、STANDARD 给解释、STRONG 给具体步骤，revealAnswer=false 硬编码进 prompt）；observation-assist 用当前观察节点 + 学生草稿文本；review 用完整事件流 + 得分。
理由：最小上下文降低 token 与泄漏面；aiPolicy 是 Definition 的一部分，天然随版本固化。

### 门控：服务端 403 为最终防线，前端隐藏只是体验
Definition.aiPolicy 对应开关 disabled → 端点 403 { code: 'AI_FEATURE_DISABLED' }；前端读取同一字段不渲染入口。review 额外要求 Run 为 COMPLETED（否则 409 AI_REVIEW_NOT_READY）。
理由：学生端无认证，门控必须在服务端；前端门控只是避免无效点击。

### 观察助手只给建议文本，采纳 = 填充文本框
端点返回 suggestion 字符串；前端「采纳」把文本填入 OBSERVATION 的 textarea，学生仍可编辑，提交必须学生自己点（走既有 SUBMIT_OBSERVATION 命令）。
理由：守住「AI 不得替学生提交观察」的硬约束，同时让建议真正可用。
