# 数据库引导：首启建库 + 版本化迁移 + 幂等种子

## Why

当前部署/换机时的数据库初始化靠手工：建库、`prisma migrate deploy`、教师账号与样板实验都是手工录入（样板实验引用的 Asset 甚至从未注册过）。这导致新环境无法一键就绪，也难以运维。

## What Changes

- 新增 `db:setup` 一键引导：`ensure-database`（库不存在则创建）→ `prisma migrate deploy`（版本化迁移，Flyway 式）→ `prisma db seed`（幂等种子）。
- 种子内容：初始教师账号（`SEED_TEACHER_USERNAME`/`SEED_TEACHER_PASSWORD` 可配，默认 `teacher_dev`）+ 样板实验（`examples/enzyme-temperature.v0.1.json`，含发布版本与其引用的 Asset 注册）。
- 种子幂等：已存在的账号/实验/资源跳过，可反复执行。
- 建库脚本复用 `@prisma/client`（`datasourceUrl` 指向维护库 `postgres`），不新增依赖。

## 影响

- 新增规格 `ops-bootstrap`；不影响既有运行时行为。
- 不新增 npm 依赖；`db:setup` 失败即非零退出，可被容器 entrypoint/CI 直接消费。
