# Proposal: phase4-student-web

## Why

Phase 1-3 已交付 Definition Schema、Capability Registry、Validator、统一 Runtime、Event Log 与 API 持久化，但全部停留在「接口与测试」层面。Iteration 1 的验证目标 3（一个统一 Runtime 运行多个 Definition）和目标 4（Event Log 完整记录）需要一个真实可操作的界面才能闭环验收。学生端是最薄的一层界面：纯消费已发布实验，不涉及编辑与 AI 生成，能以最小成本打通「教师发布 → 学生试玩 → 轨迹落库」全链路。

## What Changes

- 新增 `apps/web`：学生端 Web 应用（React + Vite），按 Definition 动态渲染节点，不针对具体实验写页面
- 节点渲染器：START/ACTION/VARIABLE_INPUT/MEDIA/OBSERVATION/QUESTION/CONDITION/END 八种节点各一个渲染组件，由当前节点类型驱动
- 运行会话：选择已发布实验 → 创建 Run → 开始 → 按节点交互（设置变量/执行操作/提交观察/回答问题）→ 推进 → 完成
- 事件轨迹面板：实时展示当前 Run 的事件流（轮询），验证 Event Log 完整性
- API 补充：学生可见的「已发布实验目录」查询端点（不含草稿）

## Capabilities

### New Capabilities
- `student-runtime-ui`: 学生端运行时界面——Definition 驱动的动态渲染、节点交互、运行会话管理、事件轨迹展示

### Modified Capabilities
- `experiment-publishing`: 新增「已发布实验目录对学生可见」需求（草稿对学生不可见）

## Impact

- 新增 `apps/web`（React 19 + Vite + TypeScript strict），接入 monorepo 与 Biome
- `apps/api` 新增一个只读端点（已发布实验目录）
- 复用 packages 的类型（experiment-schema）保证前后端契约一致
- 不涉及 AI 能力（AI Briefing/Tutor 的 UI 壳可以预留位置但不接 AI Provider）、不涉及认证（studentId 由学生手动输入或本地生成）

## Non-Goals

- Teacher Studio 编辑器、React Flow 可视化
- AI Provider / AI Tutor / AI Briefing 的真实接入
- 登录认证与权限
- 视频/图片资源的真实上传与播放（MEDIA 节点展示占位卡片 + assetId 元信息）
- 部署
