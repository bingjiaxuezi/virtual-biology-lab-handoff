# Tasks

## 1. API 生产构建入口

- [x] 1.1 验证 `apps/api` 的 `tsc -p tsconfig.build.json` 产物入口文件（确认 `dist/main.js` 路径），将 `package.json` 的 `start` 脚本改为 `node dist/main.js`；`dev` 保持 `tsx watch` 不变（实现说明：workspace 包 exports 改为条件导出，`dev` 调整为 `node --watch --conditions=development --import tsx src/main.ts`，保持开发时直连 TS 源码）
- [x] 1.2 本地验证：构建后以 `node dist/main.js` 启动（连本地 docker-compose 的 postgres），`/api/health` 返回正常；`pnpm -r run build` 与 `pnpm -r run typecheck` 全部通过
- [x] 1.3 在 API 启动引导处增加必需环境变量校验：`DATABASE_URL`、`JWT_SECRET` 缺失时以明确错误信息退出（不静默用默认值）

## 2. 环境变量契约

- [x] 2.1 扩充 `.env.example`：分节标注必需变量（`DATABASE_URL`、`JWT_SECRET`、`PORT`）与占位变量（AI Provider Key、Storage Provider 配置），每项写明用途与必需性
- [x] 2.2 对照 `apps/api` 源码实际读取的环境变量，确保 `.env.example` 无遗漏、无失效项

## 3. 容器镜像定义

- [ ] 3.1 编写 `apps/api/Dockerfile`：多阶段构建，pnpm workspace 感知（优先 `pnpm deploy --filter @virtual-biology-lab/api --prod` 方案；若产物缺包则改为整仓构建拷贝），含 `prisma/schema.prisma` 与 `migrations/`，运行时阶段仅含生产依赖与编译产物，基础镜像 `node:20-alpine`
- [ ] 3.2 编写 `deploy/docker-entrypoint-api.sh`：容器入口先执行 `prisma migrate deploy`，失败非零退出，成功后 `node dist/main.js`
- [ ] 3.3 编写 `apps/web/Dockerfile` 与 `apps/studio/Dockerfile`：仅构建阶段产出 dist（`vite build`）；`apps/studio` 配置 `base: '/studio/'`；产出供统一 Nginx 托管
- [ ] 3.4 为各 Dockerfile 编写 `.dockerignore`：排除 `node_modules`、`dist`、`.env`、`logs`、`tests`
- [ ] 3.5 本地构建全部镜像（或构建产物），用 `docker run` 冒烟验证 API 镜像：连接 postgres 容器后 `/api/health` 正常、迁移可执行、镜像内无 `.env`/源码/`devDependencies`

## 4. 发布与上传脚本

- [ ] 4.1 编写 `deploy/activate.sh`（POSIX sh，服务器执行）：备份现有配置 → 构建/加载镜像 → 迁移先行（失败即退出）→ 重建 `vlab-api` 容器（`--network story-network`、`127.0.0.1:13000:3000`、`--env-file /opt/virtual-biology-lab/.env`、`--restart unless-stopped`）→ 健康检查（重试窗口，仿 StudyPet 的 nginx:alpine wget 方式）→ 失败回滚到上一镜像 tag 并输出日志
- [ ] 4.2 编写 `deploy/upload-image.sh`（本地执行）：本地 `docker build` → `docker save | gzip` → ssh 管道 `docker load` 到服务器；注明 Windows 下用 base64 传脚本的注意事项；无本地 Docker 时的备选路径（rsync 源码到服务器构建）写入脚本注释
- [ ] 4.3 编写 `deploy/nginx.conf` 模板：server 块含学生端 `/`、教师端 `/studio/`、`/api/` 反代 `vlab-api:3000`、证书路径占位；本次仅入库不启用
- [ ] 4.4 编写 `deploy/README.md`：目录用途、执行顺序、前置条件（服务器目录结构、`.env` 权限 600、不动 `mysql8043` 等操作守则）

## 5. 验证与文档

- [ ] 5.1 `pnpm -r run test`、`pnpm -r run typecheck`、`pnpm lint` 全部通过
- [ ] 5.2 `openspec validate add-deployment --strict` 通过
- [ ] 5.3 检查 `docs/` 中是否有与部署方式冲突的描述（如 `COMPREHENSIVE_HANDOFF.md` 的 Deploy 行），如有则同步更新，保持规格与文档一致
