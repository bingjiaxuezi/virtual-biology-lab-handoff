# Proposal

## Why

项目目前没有可重复的生产部署方式：API 只能以 `tsx src/main.ts` 开发模式启动，前端只有 Vite 开发服务器，服务器（腾讯云 CVM，无 docker compose）上的目录、镜像、Nginx 路由、数据库迁移流程均未定义。为了让平台能够被真实教师/学生访问，需要先把“仓库内的部署准备”建立起来：生产可用的构建产物、Docker 镜像定义、发布脚本和环境变量契约。本变更只覆盖仓库内准备，不触碰服务器。

## What Changes

- 新增 `deployment` 能力：定义生产构建、容器镜像、发布流程与环境变量契约的规格。
- `apps/api` 的生产启动方式从 `tsx src/main.ts` 改为运行 `tsc` 编译后的 `node dist/...` 产物（开发模式 `dev` 脚本保持不变）。
- 新增容器镜像定义：`apps/api` 的 Dockerfile（多阶段构建，pnpm workspace 感知，含 `prisma migrate deploy` 入口）；`apps/web`、`apps/studio` 的前端构建（产出静态 dist，由统一 Nginx 托管，不单独携带 Nginx 容器）。
- 新增 `deploy/` 目录：服务器发布脚本（原生 docker 命令，含健康检查与失败回滚）、本地构建并通过 `docker save | ssh docker load` 上传镜像的脚本、Nginx server 块配置模板。
- 扩充 `.env.example`，形成生产环境变量契约（`DATABASE_URL`、`PORT`、`JWT_SECRET` 及 AI/Storage Provider 占位）。

## Capabilities

### New Capabilities

- `deployment`: 生产部署能力，覆盖生产构建产物要求、容器镜像构建与内容约定、发布/回滚流程、健康检查与环境变量契约。

### Modified Capabilities

（无：现有能力均不规定运行时启动命令或部署行为。）

## Impact

- 代码：`apps/api/package.json` 的 `start` 脚本；`apps/web`、`apps/studio` 的构建配置（如需相对 base 路径）。
- 新文件：`apps/api/Dockerfile`、`apps/web/Dockerfile`（或仅构建脚本）、`apps/studio/Dockerfile`（同前）、`deploy/` 下脚本与 Nginx 模板、`.env.example`。
- 依赖：不新增运行时依赖；Docker 镜像基于 `node:20-alpine` / `nginx:alpine` / `postgres:16-alpine`。
- 外部系统：目标服务器为已有腾讯云 CVM（OpenCloudOS，2 核 4G，无 docker compose，容器用原生 docker 命令管理，共享 `story-network` 与 `story-admin-web` Nginx）；本变更不执行任何服务器操作。
