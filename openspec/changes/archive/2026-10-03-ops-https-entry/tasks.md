# Tasks

## 1. 规格与文档对齐

- [x] 1.1 deployment 规格新增「HTTPS 域名入口」与「素材存储卷持久化」需求及场景
- [x] 1.2 `deploy/nginx.conf` 更新为与线上一致的双入口模板（39271 HTTP + 39272 HTTPS）
- [x] 1.3 `deploy/README.md` 补 HTTPS 入口、证书续期、安全组端口清单
- [x] 1.4 新增 `deploy/certs-setup.md` 证书签发/续期手册

## 2. 验收

- [x] 2.1 `openspec validate ops-https-entry --strict` 通过
- [x] 2.2 文档描述的端口/路径/命令与服务器实际一致（逐项核对）
