# Proposal

## Why

前两个阶段交付的领域内核目前只活在内存里：Definition 没有草稿/发布的生命周期，Run 和 Event 进程一停就丢。Teacher Studio 和 Student Web 都需要一个后端来持久化实验、版本、运行与事件，并把 Phase 1/2 的 Validator 和 Runtime 暴露成 API。本变更落地模块化单体的 API 层（NestJS + Prisma + PostgreSQL），让「教师建实验→发布版本→学生跑实验→事件落库」首次成为可持久化的闭环。

## What Changes

- 新增 `apps/api`（NestJS 模块化单体），复用既有 packages，不复制领域逻辑。
- 新增 Prisma Schema 与迁移：Experiment（草稿）、ExperimentVersion（发布后不可变）、ExperimentRun、ExperimentEvent（append-only，(runId, sequence) 唯一约束）、Asset（逻辑资源记录，只存 assetId 与元数据）。
- 教师侧 API：实验草稿 CRUD、调用 Phase 1 Validator 校验（返回稳定错误码）、发布为不可变 Version（校验不过禁止发布）。
- 学生侧 API：从已发布 Version 创建 Run、开始、dispatch 白名单命令（经 Phase 2 Runtime 执行）、查询当前 Run 状态与事件轨迹。
- Event Log 持久化：实现 Prisma 版 `EventLog` 适配器，sequence 分配在事务内完成并受唯一约束兜底；API 层采用「加载快照→恢复 Runtime→dispatch→落库新事件与新快照」的无状态执行模型。
- 本地开发基础设施：docker-compose 提供 PostgreSQL；`.env` 管理连接串；数据库健康检查端点。
- **BREAKING**（仅对本地开发流程）：Run/Event 事实源从纯内存变为 PostgreSQL；内存实现保留给单元测试。

## Capabilities

### New Capabilities

- `experiment-publishing`: 教师侧实验生命周期——草稿 CRUD、发布前强制三层校验、发布生成不可变 Version、修改已发布内容必须产生新 Version。
- `run-orchestration`: 学生侧运行服务——从固定 Version 创建/开始/推进 Run、命令经统一 Runtime 原子执行、Run 状态与事件轨迹可查询、快照持久化与恢复。

### Modified Capabilities

- `experiment-events`: 新增需求——Event Log MUST 提供持久化实现，事件在数据库中 append-only 存储，sequence 分配并发安全。

## Impact

- 新增：`apps/api`、`docker-compose.yml`（本地 PostgreSQL）、Prisma 迁移；`experiment-events` 增加持久化适配器（接口不变）。
- 依赖新增：`@nestjs/*`、`prisma`/`@prisma/client`、`pg`、`reflect-metadata`、`rxjs`；不引入 AI SDK、对象存储 SDK、前端框架。
- 约束遵守：API 不感知 React Flow/XState 内部；Definition 中资源仍只引用 assetId；Event append-only 由唯一约束兜底；Run 绑定固定 Version。
- 明确不做（后续阶段）：登录认证（随 Teacher Studio 阶段引入）、AI Provider 接入、对象存储上传、部署到服务器。
