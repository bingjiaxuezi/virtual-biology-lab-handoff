# Proposal

## Why

`add-deployment` 已建立仓库内的部署基础，但质量门禁与发布动作仍依赖人工本地执行。仓库已关联 GitHub（**公开仓库**），需要：CI 对每次提交自动验证；CD 实现"维护者点击一次即完成构建、传输、迁移、健康检查"的全自动发布；同时因为仓库公开，必须建立敏感信息与基础设施信息的硬校验，防止密钥或服务器信息误入版本库。

## What Changes

- 新增 `ci-cd` 能力：定义 CI 检查项、敏感信息硬校验、CD 触发与全自动发布链路、密钥管理要求的规格。
- 新增 `.github/workflows/ci.yml`：push/PR 触发，包含质量门禁（lint/typecheck/test/build/OpenSpec 校验）、Node 20 API 测试、API 镜像构建冒烟、**敏感信息扫描（gitleaks + 基础设施信息模式检查，命中即失败）**。
- 新增 `.github/workflows/deploy.yml`：`workflow_dispatch` 手动触发一次点击后全自动完成：构建三镜像推 GHCR → 服务器上的 self-hosted runner 接棒执行拉取与 `activate.sh`（迁移先行、健康检查、失败回滚）；含并发发布互斥。
- 服务器新增一个 GitHub self-hosted runner（仅服务本仓库、仅运行 `workflow_dispatch` 触发的部署 job），runner 主动出站连 GitHub，安全组零改动。
- GHCR 镜像包设为公开（与旧项目一致），服务器拉取无需登录；维护者本机 `build-and-upload.sh` 保留为兜底。
- 清理入库脚本/文档中的服务器 IP 等基础设施信息，改用环境变量注入；CI 对此做模式硬校验。
- 生产 `.env` 与各类密钥 MUST NOT 入库；本期 CD 无需向 GitHub Secrets 写入任何服务器私钥。

## Capabilities

### New Capabilities

- `ci-cd`: 持续集成与持续部署能力，覆盖 CI 检查项与通过标准、敏感信息硬校验、CD 触发与全自动发布链路、镜像仓库使用约定、密钥管理要求。

### Modified Capabilities

（无：`deployment` 能力规定服务器侧发布机制，本变更不修改其要求。）

## Impact

- 新文件：`.github/workflows/ci.yml`、`.github/workflows/deploy.yml`、敏感信息检查脚本；`deploy/` 脚本去除硬编码服务器 IP（改环境变量）。
- 外部系统：GitHub Actions（托管 runner + 服务器上的 self-hosted runner）、GHCR（公开 package）。
- 仓库为**公开仓库**：self-hosted runner 只在 `workflow_dispatch` 的部署 job 上使用（fork PR 无法触发），并建议仓库设置"Require approval for all outside collaborators"；GitHub 自带 secret scanning/push protection（公开仓库免费）建议在设置中确认开启。
- 一次性人工步骤（无法自动化）：生成 runner 注册 token（仓库 Settings 页面）、GHCR package 设为公开、上述仓库设置开关。
- 依赖：`add-deployment` 的 Dockerfile 与 `deploy/activate.sh`（已就绪）；首次 CD 前需完成 `deploy/README.md` 的服务器一次性准备。
