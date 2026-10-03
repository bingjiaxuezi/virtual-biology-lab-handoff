# Tasks

## 1. 敏感信息硬校验与仓库卫生

- [x] 1.1 新增 `scripts/forbidden-patterns.txt`（禁用模式清单，初始含服务器公网 IP 字面值与私钥头）与 `scripts/check-forbidden-patterns.sh`（grep 扫描，命中即非零退出）
- [x] 1.2 清理入库内容：`deploy/build-and-upload.sh`、`deploy/README.md` 等去除服务器 IP 硬编码，改用 `VLAB_SERVER` 环境变量；本地默认值写入 gitignored 文件（如 `deploy/.env.local.example` 说明）
- [x] 1.3 全仓自查：`git grep` 确认当前提交无密钥与禁用模式残留

## 2. CI Workflow

- [x] 2.1 编写 `.github/workflows/ci.yml`，触发条件 push + PR（develop/main）；`quality` job（Node 22）：`pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm -r typecheck` → `pnpm -r test` → `pnpm -r build` → OpenSpec 校验（锁定 CLI 版本，遍历未归档 change 逐个 `--strict`）
- [x] 2.2 `api-node20` job（Node 20）：仅运行 `apps/api` 测试
- [x] 2.3 `docker-smoke` job：`docker build -f apps/api/Dockerfile .`（不推送，buildx 缓存），补齐 add-deployment 任务 3.5
- [x] 2.4 `secret-scan` job：下载锁定版本的 gitleaks 二进制执行 `gitleaks detect --redact`（失败即红）+ 运行 `check-forbidden-patterns.sh`
- [x] 2.5 pnpm 统一 `pnpm/action-setup`（对齐 `packageManager: pnpm@10.30.3`）+ `actions/setup-node` 缓存

## 3. CD Workflow（点击一次全自动发布）

- [x] 3.1 编写 `.github/workflows/deploy.yml`：`workflow_dispatch` 触发，输入 `ref`（默认 `develop`）；`permissions: contents: read, packages: write`；`concurrency: vlab-production-deploy`（cancel-in-progress: false）
- [x] 3.2 `build-push` job（GitHub 托管 runner）：构建 api/web/studio 三镜像，标签 `sha-<short-sha>`，推送 GHCR
- [x] 3.3 `deploy` job（`runs-on: [self-hosted, vlab-server]`，依赖 build-push）：`docker pull` 三个镜像 → 执行 `/opt/virtual-biology-lab/deploy/activate.sh sha-<short-sha>` → 输出发布结果；脚本自带迁移先行、健康检查、失败回滚
- [x] 3.4 安全自查：确认 `runs-on: self-hosted` 只出现在 `workflow_dispatch` 触发的工作流中

## 4. 服务器 self-hosted runner 部署

- [x] 4.1 服务器创建专用用户（docker 组），下载并安装 actions runner（仅此仓库注册，labels 含 `vlab-server`）；注册 token 由维护者在 GitHub 网页生成，即用即弃（已完成：用户 ghrunner，runner v2.337.0，sha256 校验通过，name=vlab-server-1）
- [x] 4.2 runner 安装为 systemd 服务（`svc.sh install` + start），验证 GitHub 上 runner 状态为 Idle（服务 active/running，ghrunner 可执行 docker）
- [x] 4.3 服务器一次性准备核对：`/opt/virtual-biology-lab/` 目录与 `.env`（600）、`vlab-postgres` 容器运行、`deploy/` 脚本就位（activate.sh 等经 base64 方式上传）

## 5. 文档与验证

- [x] 5.1 更新 `deploy/README.md`：CI/CD 使用说明（检查项、一键发布流程、回滚方式、runner 降级手工路径）、服务器准备清单更新（无需 GHCR 登录——公开包）
- [x] 5.2 workflow YAML 语法校验（actionlint 或等价手段）
- [x] 5.3 推送后观察 CI 四个 job 全绿（含 docker-smoke）；本机既有 lint 错误（用户未提交改动）先与维护者确认处理方式
- [x] 5.4 负向验证：在测试分支提交一个假密钥，确认 secret-scan 将 CI 打红，随后删除该分支
- [x] 5.5 端到端验证：手动触发 deploy.yml，确认全自动完成构建 → 推送 → 服务器激活 → 健康检查通过
- [x] 5.6 `openspec validate add-ci-cd --strict` 通过
- [ ] 5.7 提请维护者在 GitHub 网页完成一次性设置（GHCR 包已验证公开可匿名拉取，无需操作）：Actions 权限启用 "Require approval for all outside collaborators"；确认 secret scanning + push protection 已开启
