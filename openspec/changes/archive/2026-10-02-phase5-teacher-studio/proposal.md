# Proposal: phase5-teacher-studio

## Why

Phase 1-4 打通了「定义 → 校验 → 运行 → 持久化 → 学生端」链路，但教师还只能手写 JSON 草稿。产品的核心价值是教师能自己创建、修改、发布实验（docs/product/overview.md）。同时 Phase 3 遗留的认证缺口必须在教师端开放前补上——目前任何人都能调用草稿/发布接口。

## What Changes

- 新增 `apps/studio`：教师端 Web 应用（React 19 + Vite + React Flow）
- 教师认证：账号注册/登录（用户名+密码 → JWT），教师侧写操作全部要求认证
- 实验管理：列表、空白新建、编辑草稿、删除、发布（复用 Phase 3 API）
- 可视化编辑器：React Flow 节点图（编辑/展示用，坐标不持久化，Definition 仍是唯一真值源）+ 节点属性表单 + 变量/规则/资源编辑 + 实时校验问题面板
- 教师试玩：浏览器内直接加载 Runtime 包本地运行草稿，不经 API、不落库
- 学生轨迹查看：教师按实验查看 Run 列表与完整事件流
- AI Copilot 入口占位：此阶段不接 AI Provider

## Capabilities

### New Capabilities
- `teacher-auth`: 教师账号注册/登录、JWT 会话、教师侧接口鉴权
- `teacher-studio`: 实验管理、可视化编辑器、草稿试玩、学生轨迹查看

### Modified Capabilities
- `experiment-publishing`: 草稿写操作与发布 MUST 要求教师认证；新增按实验查询学生 Run 列表的教师端点

## Impact

- 新增 `apps/studio`；`apps/api` 新增 auth 模块 + User 表迁移 + Runs 查询端点 + 认证守卫
- 新增依赖：@xyflow/react（编辑器）、bcryptjs + @nestjs/jwt（认证）
- 学生端 `apps/web` 不受影响（catalog/运行端点保持公开）
- 明确不做：AI Copilot 真实接入（Phase 6）、模板创建、多教师协作权限
