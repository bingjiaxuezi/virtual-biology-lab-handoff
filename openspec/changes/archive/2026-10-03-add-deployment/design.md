# Design

## Context

- 目标服务器为已有腾讯云 CVM（OpenCloudOS，2 核 4G），**未安装 docker compose**，容器用原生 `docker run/inspect/stop/rm` 管理；已存在 `story-network` 网络、`story-admin-web` Nginx（占 80/443）、`mysql8043`（他项目在用，不可动）。旧项目（a-single-sentence-story、StudyPet）已验证“本地/CI 构建镜像 → 上传 → 原生 docker 命令发布 → 健康检查 + 回滚”的模式。
- 本仓库为 pnpm workspace monorepo：`apps/api`（NestJS + Prisma）依赖 5 个 `workspace:*` 的 `packages/*`；`apps/web`、`apps/studio` 为 Vite React。当前 API `start` 脚本用 `tsx` 直接跑 TS。
- 服务器安全组仅放行 22（白名单）、80、443。

## Goals / Non-Goals

**Goals:**
- 仓库内产出可复现的镜像构建定义与发布脚本，本变更不执行任何服务器操作。
- API 生产运行不依赖 tsx；前端产出纯静态产物。
- 发布脚本具备：迁移先行、健康检查、失败回滚。
- `.env.example` 成为环境变量契约。

**Non-Goals:**
- 不在服务器上创建目录、启动容器或修改 Nginx（属后续 Phase 1/2 变更）。
- 不引入 docker compose / k8s 到服务器（沿用原生 docker 模式）。
- 不配置 CI/CD 流水线（Phase 3 再做）；本次仅提供本地构建 + 上传脚本。
- 不实现 AI/Storage Provider 的运行时配置读取（仅占位环境变量）。

## Decisions

### D1: API 生产入口改为编译产物
`apps/api` 的 `build` 已输出 `dist/`；`start` 改为 `node dist/main.js`（以实际入口文件名为准），`dev` 保持 `tsx watch`。
- 实施时发现：5 个 workspace 包的 `exports` 直接指向 `./src/*.ts`，纯 Node 无法在生产环境运行。决策：各包改为条件导出——`types`/`development` 指向 `./src/*.ts`、`import` 指向 `./dist/index.js`；`apps/api` 的 `dev` 改为 `node --watch --conditions=development --import tsx src/main.ts`（已实测：不加 condition 时 tsx 会命中 dist 陈甹产物，加 `--conditions=development` 后命中 TS 源码）。生产链路为 `pnpm -r build`（拓扑序）→ `node dist/main.js`。备选 esbuild 打 bundle 被否决：esbuild 不生成 decorator metadata，会破坏 Nest DI。
- 备选：生产也用 tsx。否决：tsx 是 devDependencies，生产镜像引入它会违背“镜像不含开发依赖”，且启动慢、错误栈不友好。
- workspace 依赖处理：多阶段 Dockerfile 中使用 `pnpm deploy --filter @virtual-biology-lab/api --prod` 产出独立可运行的目录（含 workspace 包的编译产物），再复制到精简运行时镜像。需要先在 CI/本地验证 `pnpm deploy` 对 `workspace:*` 的打包结果；若产物缺包，则退回“整个 monorepo 构建后拷贝 `node_modules` + `dist`”方案，并记录在 tasks 验收中。

### D2: 前端不单独携带 Nginx 容器
`apps/web`、`apps/studio` 的 Dockerfile 只做构建（`vite build`），最终静态文件由服务器共享的 `story-admin-web` Nginx 托管（新增 server 块，`/` 学生端、`/studio` 教师端、`/api/` 反代 `vlab-api`）。
- 备选：每个前端各跑一个 nginx 容器。否决：服务器只有 80/443 两个入口且已有共享 Nginx 模式，多容器徒增路由复杂度。
- 教师端需配置 Vite `base: '/studio/'` 以支持子路径托管。

### D3: 发布脚本沿用 StudyPet activate.sh 模式
`deploy/activate.sh`（POSIX sh，在服务器执行）流程：`docker build`（或 load 已上传镜像）→ 一次性容器跑 `prisma migrate deploy`（失败即退出，不动旧容器）→ 重建 `vlab-api` 容器 → 用 `docker run --rm --network story-network nginx:alpine wget` 做健康检查 → 失败则回滚到上一个镜像 tag 并输出日志。镜像 tag 用日期戳（如 `vlab-api:20261002`）。
- 端口：`vlab-api` 绑定 `127.0.0.1:13000:3000`（避开 story-server 的 18081），同时加入 `story-network` 供 Nginx 反代。
- `deploy/upload-image.sh`（本地执行）：本地 `docker build` → `docker save | gzip` → `ssh` 管道 `docker load`，作为 GHCR/CI 之前的过渡方式。
- Windows 传脚本注意：用 base64 方式传输避免 PowerShell 换行污染（旧运维手册已记录该坑）。

### D4: 环境变量契约
`.env.example` 增加注释分节：必需（`DATABASE_URL`、`JWT_SECRET`）与占位（AI Provider Key、Storage Provider 配置），每项注明用途与是否必需。API 启动时校验 `DATABASE_URL`、`JWT_SECRET` 存在，缺失则以明确错误退出（与 `teacher-auth` 规格的密钥外部化要求一致）。
- Nginx 配置模板放 `deploy/nginx.conf`，Phase 2 才合入共享 Nginx 镜像。

## Risks / Trade-offs

- `pnpm deploy --prod` 对含 Prisma 的 workspace 包可能漏拷贝 `schema.prisma`/迁移文件或引擎——tasks 中加入本地 `docker run` 冒烟验证，失败则改用整仓构建方案。
- 共享 `story-admin-web` 的 Nginx 配置变更是全局的：配置模板本次只入库不启用，Phase 2 操作时须先备份现有 conf.d（StudyPet 脚本已有此步骤可复用）。
- 本地 Windows 构建 Linux 镜像依赖 Docker Desktop 的 linux/amd64 支持；若本机无 Docker，则上传脚本需支持在服务器端构建（把源码 rsync 上去 build），作为备选路径写入脚本说明。
- 2 核 4G 资源有限：postgres + NestJS + Nginx 预计内存占用 < 1.5G，可接受；构建动作不在服务器上进行（除非备选路径）。
