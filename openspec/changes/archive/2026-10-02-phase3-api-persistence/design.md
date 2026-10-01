# Design

## Context

Phase 1/2 已交付纯领域 packages（schema/registry/validator/events/runtime），全部内存态、零基础设施依赖。本变更首次引入应用层与数据库。约束：Iteration 1 模块化单体；Provider 接口隔离供应商；Event append-only；Run 绑定固定 Version。动机见 proposal.md。

## Goals / Non-Goals

**Goals:**
- `apps/api`（NestJS）：experiments / versions / runs / events / assets / health 模块
- Prisma + PostgreSQL 持久化，含迁移与本地 docker-compose
- DB 版 EventLog 适配器（事务内分配 sequence + 唯一约束）
- 无状态 dispatch：快照恢复 → Runtime 执行 → 落库

**Non-Goals:**
- 登录认证与权限（随 Teacher Studio 阶段）
- AI Provider、对象存储实际上传、前端、服务器部署
- WebSocket 实时推送（v0.1 轮询即可）

## Decisions

### 模块化单体：一个 NestJS 应用，按领域分模块
`experiments`（草稿+发布）、`runs`（创建/dispatch/查询）、`events`（轨迹查询）、`assets`（逻辑登记）、`health`。
理由：AGENTS.md 明确 Iteration 1 不拆微服务；模块边界即未来拆分缝。

### Run 执行模型：无状态 dispatch + 快照恢复
API 实例不常驻 XState actor。每次 dispatch：从 DB 读最近 Run 快照 → `runtime.restore()` 重建 → 执行命令 → 事务写入新事件 + 新快照。
理由：API 可水平扩展、重启无状态；Phase 2 的 restore 已验证行为一致；代价是每命令一次 machine 编译（毫秒级，可接受，后续可加进程内缓存）。
备选：常驻 actor + 单实例——拒绝，违反可恢复性目标。

### sequence 分配：事务内 MAX+1 + 唯一约束兜底
DB EventLog 的 append：在事务中 `SELECT MAX(sequence) FOR UPDATE`（或以 Run 行做锁点）后插入；(runId, sequence) 唯一索引兜底，冲突即整事务回滚。
理由：数据库是最终防线，与 spec 的并发需求一致；不依赖应用层锁。

### 快照即 Run 行
Run 表直接保存 currentNodeId、state(JSONB)、score、status、lastSequence——快照不需要单独的表；恢复语义与 Phase 2 RunSnapshot 一致。
理由：减少一次 join，快照本来就是 Run 的最新状态投影。

### 版本不可变的实现
ExperimentVersion 表只插入不更新（应用层无 update 路径）；Definition 以 JSONB 整体快照存储；version 号 = 该 experiment 下 MAX(version)+1（事务内）。
理由：不可变靠「不写更新路径 + 快照冗余」保证，简单可靠；JSONB 快照让旧版本不受 Schema 演进影响。

### 测试策略
包级单测不动；apps/api 用 Nest 测试工具做模块级测试：EventLog/服务层用真实 Prisma 连 docker-compose 的 PostgreSQL（mark 为 integration，可跳过），控制器层用 mock service。
理由：集成测试需要真库验证唯一约束与事务，但本地无库时必须可跑纯单测。

## Risks / Trade-offs

- [每命令重建 machine 的性能开销] → 毫秒级；后续可加 actor 缓存层，接口不变。
- [Prisma JSONB 中 Definition 与 Zod Schema 漂移] → 读取时经 `experimentDefinitionSchema.parse` 防御，发布时已全量校验。
- [无认证状态下 API 裸露] → 仅限本地开发阶段；Teacher Studio 阶段第一件事就是接入认证，已在提案中显式声明。
- [docker-compose 引入第一个基础设施依赖] → 仅本地开发用，生产部署复用既有服务器方案另行评估。
