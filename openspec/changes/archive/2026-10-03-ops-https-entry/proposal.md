# HTTPS 域名入口与素材卷持久化沉淀

## 为什么

生产环境已上线两项运维能力，但尚未沉淀到规格与仓库文档：

1. **HTTPS 域名入口**：DuckDNS 域名 `virtual-biology-lab.duckdns.org` + Let's Encrypt 证书（acme.sh DNS-01，自动续期），因腾讯云对未备案域名拦截 80/443，HTTPS 走非标端口 39272，nginx 按 server_name SNI 分流到 vlab。
2. **素材卷持久化**：`vlab-api` 容器必须挂载命名卷 `vlab-storage:/app/storage`，否则素材文件随容器重建丢失（已实际发生一次故障并修复）。

## 变更内容

- `deployment` 规格新增两条需求：HTTPS 入口契约、素材存储卷契约。
- `deploy/README.md` 补充 HTTPS 入口、证书续期机制与安全组端口清单。
- `deploy/nginx.conf` 模板更新为与服务器实际一致（39271 HTTP + 39272 HTTPS 两个 server 块）。
- 新增 `deploy/certs-setup.md`：DuckDNS + acme.sh DNS-01 签发/续期操作手册（沿用旧项目 playbook 并按本项目参数改写）。

## 影响

- 规格：`deployment`（新增 2 条需求）
- 文档：`deploy/` 三个文件；无代码变更
- 服务器侧配置（nginx-conf、acme.sh）已在线生效，本变更为文档与规格对齐
