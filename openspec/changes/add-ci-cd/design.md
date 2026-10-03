# Design

## Context

- 仓库已关联 GitHub（`bingjiaxuezi/virtual-biology-lab-handoff`），工作分支 `develop`，尚无 `.github/`。**仓库为公开仓库**（已核实 `visibility=public`），这对 runner 安全与敏感信息提出更高要求。
- `add-deployment` 已交付：三个 Dockerfile、`deploy/activate.sh`（迁移先行 + 健康检查 + 回滚）、`deploy/build-and-upload.sh`、`deploy/README.md`。任务 3.5（容器构建冒烟）因本机 Docker Desktop 卡死未完成，挪到 CI 干净环境验证。
- 服务器约束：无 docker compose；安全组 22 仅放行维护者 IP 段，**GitHub 托管 runner 到服务器的任何直连都会被拦截**；服务器到 ghcr.io 链路不稳定（旧项目踩坑）。
- 维护者明确要求：点击一次即全自动完成打包与部署；敏感信息不得进入 GitHub。
- OpenSpec CLI 需要 Node 22+；仓库 `engines` 声明 `>=20`。

## Goals / Non-Goals

**Goals:**
- CI 覆盖 lint / typecheck / test / build / OpenSpec 校验 / 镜像构建冒烟 / 敏感信息硬校验，push 与 PR 触发。
- CD 手动触发一次点击后全自动完成：构建、归档、服务器拉取、迁移、健康检查、失败回滚。
- 服务器安全组零改动、零新增入站端口。
- GitHub Secrets 中不存放服务器私钥等长期密钥。

**Non-Goals:**
- 不引入 staging 环境。
- 不改 `deployment` 能力定义的服务器侧发布机制。
- 不做数据库备份自动化。
- 不把仓库改为私有（由 runner 使用约束与审批设置控制风险）。

## Decisions

### D1: CI 结构——四个并行 job
- `quality`（Node 22）：`pnpm install --frozen-lockfile` → `biome check` → `pnpm -r typecheck` → `pnpm -r test` → `pnpm -r build` → OpenSpec 校验。
- `api-node20`（Node 20）：仅 `apps/api` 测试，守住 `engines: >=20` 下限。
- `docker-smoke`：`docker build -f apps/api/Dockerfile .`（不推送，buildx 缓存）。
- `secret-scan`：gitleaks 扫描 + 基础设施禁用模式检查（见 D5）。
- pnpm 用 `pnpm/action-setup`（对齐 `packageManager: pnpm@10.30.3`），`actions/setup-node` 开 pnpm 缓存。

### D2: Node 版本策略
主流程 Node 22，Node 20 单独 job 跑 API 测试；用 `22`/`20` 滚动次版本，与生产镜像 `node:20-alpine` 一致。

### D3: CD 触发——workflow_dispatch 即闸门
输入 `ref`（默认 `develop`）。点击"Run workflow"就是发布闸门，之后零人工介入。普通 push 绝不触发生产变更。配 `concurrency: vlab-production-deploy`（cancel-in-progress: false）防止并发发布。

### D4: 镜像标签与归档
标签 `sha-<short-sha>`，三镜像推 GHCR 归档（`GITHUB_TOKEN` + `packages: write`）。**镜像包设为公开**（一次性手动设置，与旧项目一致），服务器拉取无需 `docker login`。不使用 `latest`。

### D5: 敏感信息硬校验（仓库为公开仓库的前置防线）
CI `secret-scan` job 两道闸：
1. gitleaks（锁定版本，直接下载官方二进制运行，不引第三方 action 减少供应链面）扫描提交中的密钥/私钥/令牌；输出 `--redact`，命中即失败。
2. 禁用模式检查：一个小脚本 grep 仓库内禁止出现的模式（当前为服务器公网 IP 字面值、各类私钥头），命中即失败。模式清单入库（`scripts/forbidden-patterns.txt`），新增模式走正常评审。
- 配套清理：`deploy/` 脚本与文档中移除服务器 IP 硬编码，改 `VLAB_SERVER` 环境变量（本地默认值放 gitignored 文件）。
- 建议在仓库设置确认 GitHub 自带 secret scanning + push protection（公开仓库免费）——这是平台侧双保险，需维护者在网页确认。
- 已核实：`apps/api/.env`（含真实 AI Key）从未进入 git 历史。

### D6: 全自动发布的关键——服务器 self-hosted runner
在服务器上部署 GitHub Actions self-hosted runner（仅此仓库），部署 job `runs-on: [self-hosted, vlab-server]`。runner 主动出站连 GitHub 接取任务，**安全组与入站端口零改动**，天然绕开"runner 无法直连服务器"的约束。部署 job 内容：拉取三个 GHCR 镜像 → 执行 `/opt/virtual-biology-lab/deploy/activate.sh sha-<short-sha>`。
- 安全约束（公开仓库必须做到）：
  - 部署 job 只由 `workflow_dispatch` 触发——fork PR 无法触发 `workflow_dispatch`，外部人员无法让代码在 runner 上执行；
  - 所有 PR/push 触发的 job 全部跑在 GitHub 托管 runner，`runs-on: self-hosted` 不出现在任何可被 PR 触发的工作流中；
  - 仓库设置启用 "Require approval for all outside collaborators"（一次性手动）；
  - runner 以专用用户运行（docker 组），仅注册到本仓库。
- 备选 A（webhook agent 挂 443）：引入自研鉴权端点，攻击面与维护成本更高，否决。
- 备选 B（安全组放行 Actions IP 段）：段大且频繁变化，否决。
- 备选 C（维护者本机一键脚本）：保留为 runner 故障时的降级路径（`deploy/activate.sh` 手工执行即可）。

### D7: 密钥
- GitHub Secrets：**零长期密钥**。GHCR 推送用自动注入的 `GITHUB_TOKEN`；runner 注册 token 为一次性、注册时即用即弃，不落 Secrets。
- 服务器侧：`/opt/virtual-biology-lab/.env`（chmod 600）维持本地管理；GHCR 公开包拉取无需凭证。
- runner 主机信任假设：服务器与维护者本机同级信任；runner 只执行本仓库 `workflow_dispatch` 触发的固定部署步骤。

### D8: OpenSpec 校验的实现
CI 中 `npm i -g @fission-ai/openspec`（锁定与仓库技能一致的版本，Node 22 运行），遍历 `openspec/changes/` 非 `archive/` 目录逐个 `openspec validate <name> --strict`；无进行中 change 时跳过。

## Risks / Trade-offs

- self-hosted runner 让服务器具备"执行仓库代码"的能力：通过 D6 的触发约束与审批设置控制风险；仓库若未来转私有可进一步收紧。
- GHCR 公开包意味着镜像可被任何人拉取：镜像内不含密钥（deployment 规格已要求），可接受。
- runner 进程常驻服务器（空闲约百 MB 内存），2 核 4G 可承受。
- CI 的 docker-smoke 首次构建数分钟，buildx 缓存后缩短。
- gitleaks 存在误报可能：命中时按文件白名单流程（`.gitleaksignore`）处理，不允许全局关闭扫描。
