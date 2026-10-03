# 部署说明（deploy/）

目标环境：腾讯云 CVM（OpenCloudOS，2 核 4G），**无 docker compose**，容器用原生 docker 命令管理。

## 文件清单

| 文件 | 执行位置 | 用途 |
| --- | --- | --- |
| `../apps/api/Dockerfile` | 本地/CI | API 生产镜像（多阶段，pnpm deploy --prod） |
| `../apps/web/Dockerfile`、`../apps/studio/Dockerfile` | 本地/CI | 前端构建镜像（最终 dist 由共享 Nginx 托管） |
| `docker-entrypoint-api.sh` | 镜像内 | 容器入口：`prisma migrate deploy` → `node dist/main.js` |
| `build-and-upload.sh` | 本地（Git Bash/WSL） | 构建三个镜像并经 ssh 管道 `docker load` 到服务器 |
| `activate.sh` | 服务器 | 发布 vlab-api：备份 → 迁移先行 → 重建容器 → 健康检查 → 失败回滚 |
| `nginx.conf` | 服务器 | 共享 Nginx 的 server 块模板（与线上 nginx-conf 一致：39271 HTTP + 39272 HTTPS） |
| `certs-setup.md` | 服务器 | HTTPS 证书手册（DuckDNS + acme.sh DNS-01，签发/续期/换域名） |

## 服务器前置条件（Phase 1 首次部署时执行一次）

```bash
mkdir -p /opt/virtual-biology-lab/{backups,deploy}
# CD 的 self-hosted runner 以 ghrunner 用户执行 activate.sh，目录属主需为 ghrunner
chown -R ghrunner:ghrunner /opt/virtual-biology-lab
cp .env.example /opt/virtual-biology-lab/.env  # 填写生产值后 chmod 600
# PostgreSQL 容器（内网可达，不暴露端口）：
docker run -d --name vlab-postgres --restart unless-stopped \
  --network story-network --network-alias vlab-postgres \
  -e POSTGRES_USER=vlab -e POSTGRES_PASSWORD=<生产密码> -e POSTGRES_DB=virtual_biology_lab \
  -v vlab-postgres-data:/var/lib/postgresql/data \
  postgres:16-alpine
# .env 中 DATABASE_URL 主机名用 vlab-postgres（容器别名），不是 localhost
```

素材文件存储在命名卷 `vlab-storage`（activate.sh 重建容器时自动挂载，无需手工创建；丢失挂载会导致素材 404）。

## 访问入口与安全组

| 入口 | 地址 | 说明 |
| --- | --- | --- |
| HTTPS 学生端 | `https://virtual-biology-lab.duckdns.org:39272/` | 推荐，证书 acme.sh 自动续期 |
| HTTPS 教师端 | `https://virtual-biology-lab.duckdns.org:39272/studio/` | 同上 |
| HTTP 备用 | `http://<server-ip>:39271/` | IP 直连，不受域名拦截影响 |

安全组（防火墙）需放行：TCP 22（白名单 IP）、39271、39272。80/443 对未备案域名被腾讯云拦截，vlab 不使用。证书签发/续期见 `certs-setup.md`。

## 发布流程

### 正式路径：GitHub 一键发布（CD）

仓库 Actions 页面手动触发 **Deploy** 工作流，选择目标引用（默认 `develop`），点击后全自动完成：

1. GitHub 托管 runner 构建 api/web/studio 三个镜像，标签 `sha-<short-sha>`，推送 GHCR（公开包，服务器拉取免登录）
2. 服务器上的 self-hosted runner（`vlab-server-1`）拉取三镜像，执行 `/opt/virtual-biology-lab/deploy/activate.sh sha-<short-sha>`
3. activate.sh 完成迁移先行 → 重建容器 → 健康检查，失败自动回滚到上一版本

并发互斥：`concurrency: vlab-production-deploy`，重复触发排队而非并行。不使用 `latest` 标签，回滚即重新触发旧 tag 或在服务器手动 `activate.sh <旧tag>`。

### 降级路径：手工发布（runner 不可用时）

1. 本地：`VLAB_SERVER=root@<server> deploy/build-and-upload.sh 20261002`（无本地 Docker 时见脚本内备选路径注释）
2. 服务器：`/opt/virtual-biology-lab/deploy/activate.sh 20261002`
3. 验收：`docker run --rm --network story-network nginx:alpine wget -qO- http://vlab-api:3000/api/health`

## CI 检查项（每次 push / PR 自动运行）

- `quality`（Node 22）：frozen-lockfile 安装 → lint → typecheck → test → build → OpenSpec 未归档 change 逐个 `--strict` 校验
- `api-node20`：Node 20 下限跑 API 测试（对齐 `engines: >=20`）
- `docker-smoke`：构建 API 生产镜像（不推送，buildx gha 缓存）
- `secret-scan`：gitleaks 密钥扫描 + `scripts/check-forbidden-patterns.sh` 禁用模式检查；服务器 IP 等敏感模式不入库，由仓库 Variables `FORBIDDEN_PATTERNS_EXTRA`（base64）注入

任一 job 失败即整体打红，阻止问题合入。

## 操作守则（沿用旧项目约定）

- 任何变更前先 `docker ps` / `docker inspect` 确认现状
- 不要动 `mysql8043` 容器；不要 `docker system prune`；不要重启 docker daemon
- `.env` 权限保持 600；改配置需重建容器生效
- Windows 向服务器传脚本用 base64 方式（见 build-and-upload.sh 注释）
- 22 端口仅放行白名单 IP；多次 SSH 失败会被云镜封禁，兜底走腾讯云 VNC
