# Design

## Context

Phase 1-4 已完成「定义 → 校验 → 运行 → 持久化 → 学生端」闭环，但教师侧只有裸 API：创建/发布草稿需要手写 JSON，且接口完全无认证。本阶段交付教师端 Web 应用与最小可用的教师认证。约束（AGENTS.md）：React Flow 只负责编辑/展示，坐标不进 Definition，Definition 仍是唯一持久化真值源；学生端与目录端点保持公开；AI 只留入口。

## Goals / Non-Goals

**Goals:**
- `apps/studio`：教师端应用（React 19 + Vite + @xyflow/react）
- 教师认证：注册/登录 → JWT；API 侧草稿写操作与发布端点加守卫
- 可视化编辑器：React Flow 节点图 + 属性表单 + 校验问题面板
- 教师试玩：浏览器内直接运行草稿 Definition，不经 API
- 学生轨迹查看：按实验列出 Run 与事件流

**Non-Goals:**
- AI Copilot 真实接入（Phase 6）
- 多教师协作/权限隔离（当前所有教师可见全部实验）
- 资源上传与媒体处理、React Flow 坐标持久化、部署

## Decisions

### 认证：最小 JWT，注册即教师
`POST /api/auth/register`、`POST /api/auth/login` 返回 JWT（@nestjs/jwt + bcryptjs 哈希，User 表单次迁移）。`Authorization: Bearer` 由全局 `AuthGuard` 校验；学生端公开端点（catalog、runs 创建/读取/dispatch）标注 `@Public()` 放行，其余默认要求认证。
理由：当前只有教师一种角色，不引入 RBAC/会话表；JWT 无状态，与 API 无状态 dispatch 风格一致。密钥走环境变量，默认值仅本地开发。

### 试玩：浏览器内直接跑 Runtime 包
`experiment-runtime` 与 `InMemoryEventLog` 是纯 TS 包（packages 直接导出 TS 源码，Vite 可编译），教师试玩在前端内存中加载草稿 Definition 创建 Runtime，dispatch 在本地同步完成，不产生 Run 记录。
理由：试玩不需要持久化与并发控制；复用同一份 Runtime 代码保证「教师试玩 ≡ 学生真实运行」，无第二套实现。

### React Flow：坐标不持久化，加载时自动布局
Definition 无坐标信息，打开编辑器时用 dagre 对节点图做一次性自动布局；编辑操作（增删节点/连线、属性修改）直接改 Definition JSON 内存模型，React Flow 只是投影。不保存 viewport/坐标。
理由：遵守「React Flow 不得作为持久化领域模型」；自动布局对 ≤ 几十节点的实验图足够可读。连线仅允许按节点类型的 next/onTrue/onFalse 语义建立，保存时过 Phase 1 三层 Validator，问题实时展示在面板。

### 编辑器模型：单向数据流
`definition (state) → 派生 nodes/edges → React Flow 渲染`；用户在属性表单或图上操作 → 生成新 definition → 重新派生。校验用 `experiment-validator` 在浏览器内对每次变更运行。
理由：单一真值源在内存 Definition，图上不会出现与 Definition 不一致的「幽灵连线」；Validator 已是纯函数包，前端直接复用。

### 学生轨迹：只读查询端点
新增 `GET /api/experiments/:id/runs`（教师认证）：按实验（跨全部已发布版本）列出 Run 摘要；事件流复用学生端已有的 `GET /api/runs/:id/events` 但改为需要认证的学生轨迹查看。
理由：Run 与 Version 已关联（Phase 3 表结构），一次 join 即可；不引入新表。
