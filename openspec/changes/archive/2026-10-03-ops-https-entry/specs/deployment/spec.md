# deployment Specification Delta

## ADDED Requirements

### Requirement: HTTPS 域名入口
生产环境 MUST 提供 HTTPS 入口：域名 `virtual-biology-lab.duckdns.org`（DuckDNS），证书由 acme.sh 以 DNS-01（`dns_duckdns`）签发 Let's Encrypt 证书并配置 cron 自动续期，续期后 MUST 自动 reload nginx。因未备案域名在腾讯云 80/443 端口被拦截，HTTPS MUST 使用非标准端口 `39272`，nginx MUST 以 `server_name` SNI 分流到本项目的 web/studio/api，MUST NOT 影响同 nginx 上其他站点的默认 server 块。

#### Scenario: HTTPS 访问学生端
- **WHEN** 浏览器访问 `https://virtual-biology-lab.duckdns.org:39272/`
- **THEN** 证书链可信（无警告），返回学生端页面

#### Scenario: SNI 分流互不影响
- **WHEN** 同一 443/39272 上存在其他 server_name 的站点
- **THEN** 按 SNI 命中对应 server 块，默认 server 块行为不变

#### Scenario: 证书自动续期
- **WHEN** acme.sh cron 检测到证书临近到期
- **THEN** 自动续期并执行 `docker exec story-admin-web nginx -s reload`

### Requirement: 素材存储卷持久化
`vlab-api` 容器 MUST 挂载命名卷 `vlab-storage` 到 `/app/storage`（发布脚本与回滚路径均 MUST 包含该挂载），上传的素材文件 MUST NOT 随容器重建丢失。

#### Scenario: 容器重建素材保留
- **WHEN** 发布新版本重建 vlab-api 容器
- **THEN** 已上传素材文件仍可访问（内容端点返回 200）

#### Scenario: 回滚保留挂载
- **WHEN** 发布失败回滚到上一镜像
- **THEN** 回滚容器同样挂载 vlab-storage
