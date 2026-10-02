# Design

## Context

Phase 3 的 API 已提供完整运行编排（无状态 dispatch + 快照恢复）。学生端界面是纯消费者：不持有领域逻辑，所有状态变更经 API 命令完成。约束：React Flow 只用于教师编辑器（本阶段不涉及）；前端不得绕过 API 直接推状态；AI 相关 UI 只留结构位置。

## Goals / Non-Goals

**Goals:**
- `apps/web`：Definition 驱动的学生端运行时界面
- 八种节点类型的通用渲染器 + 运行会话 + 事件轨迹面板
- 已发布实验目录端点（API 侧小补充）

**Non-Goals:**
- 教师编辑器 / React Flow
- AI Provider 接入、认证、资源上传、部署

## Decisions

### 前端不做状态机，只做「命令发送器 + 状态展示器」
Run 的推进逻辑完全在服务端 Runtime（Phase 2/3 已验证）。前端渲染 `GET /runs/:id` 返回的 currentNodeId/state，把用户操作翻译成 dispatch 命令（SET_VARIABLE/PERFORM_ACTION/SUBMIT_OBSERVATION/ANSWER_QUESTION/ADVANCE）POST 出去，用响应里的新状态刷新界面。
理由：单一事实源在服务端；前端重复实现规则引擎会立刻与服务端漂移。

### 节点渲染器注册表：nodeType → 组件
`renderers: Record<NodeType, Component>`，新增节点类型时加组件而非改流程逻辑。Definition 从 API 响应的 version 快照获取（创建 Run 时一并返回或单独拉取）。
理由：与后端 Capability Registry 同构，前后端各有一份「能力驱动渲染」的映射。

### 变量输入控件按变量类型与 inputMode 选择
NUMBER+SLIDER → 滑块（带 min/max/unit）；NUMBER+STEPPER → 数字步进；ENUM → 单选组；BOOLEAN → 开关。SET_VARIABLE 命令在值变化时发送（不在每次拖动中发送——提交按钮确认）。
理由：变量定义里的 min/max/options 就是校验规则，前端控件直接消费，无需重复声明。

### 事件轨迹轮询而非 WebSocket
每 2-3 秒轮询 `GET /runs/:id/events`，或每次 dispatch 响应后刷新（dispatch 响应本身已携带新事件，轮询只是兜底）。
理由：Phase 3 已明确 v0.1 不引入 WebSocket；dispatch 响应携带事件让大部分刷新零额外请求。

### MEDIA 节点渲染占位
资源只有 assetId 逻辑引用，无真实 URL。渲染为资源卡片：类型图标 + assetId + name + metadata；TEXT 类型直接渲染文本内容（metadata.text）。
理由：对象存储是后续阶段；占位卡片保持界面完整可验收。

### 路由与页面结构
React Router 三个页面：`/`（已发布实验目录）、`/runs/:runId`（运行时）、`/runs/:runId/review`（完成后轨迹复盘，复用事件面板）。
理由：学生侧 Iteration 1 范围最小闭环。

### 样式方案
纯 CSS（单个 stylesheet + CSS 变量），不引入组件库。工具型界面：信息密度优先、克制的配色、无营销式 hero。
理由：Iteration 1 是功能验证；引入 Tailwind/MUI 的成本超过收益。

### studentId 处理
本地生成并持久化在 localStorage（`vlab_student_id`），页头可查看/重新生成。无认证阶段的最简方案。

## Risks / Trade-offs

- [轮询延迟导致轨迹面板滞后] → dispatch 响应已携带事件，轮询仅兜底；可接受。
- [前端缓存 Definition 与服务端版本漂移] → Run 绑死 version，definition 从该 version 读取，无漂移面。
- [无认证下 studentId 可伪造] → 本阶段仅限本地开发验证，Teacher Studio 阶段统一接认证。

## Testing

- 渲染器组件测试（vitest + @testing-library/react）：八种节点各渲染正确、交互发出正确命令
- 会话流程测试（mock fetch）：目录 → 创建 → 开始 → 80℃ 路径 → 完成，命令序列正确
- 真实联调依赖 docker-compose 的库 + API，手动验证
