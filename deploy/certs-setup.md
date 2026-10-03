# HTTPS 证书手册（DuckDNS + acme.sh DNS-01）

适用场景：腾讯云国内机房、域名未 ICP 备案、零成本。线上已按本手册配置完成，此文档用于续期排障与重建。

## 现状约定

- 域名：`virtual-biology-lab.duckdns.org`（DuckDNS 免费子域，A 记录指向服务器公网 IP）
- 签发：acme.sh（`/root/.acme.sh`），DNS-01 走 `dns_duckdns`，token 存于 `/root/.acme.sh/account.conf`
- 证书安装位置（挂载进共享 nginx 容器）：`/opt/a-single-sentence-story/deploy/certs/vlab-{fullchain,privkey}.pem`
- HTTPS 端口：`39272`（80/443 对未备案域名被腾讯云拦截，不可用）
- 续期：acme.sh cron 自动执行（约 60 天），reloadcmd 为 `docker exec story-admin-web nginx -s reload`

## 重新签发（换域名 / 证书丢失时）

```bash
export DuckDNS_Token=<duckdns 账号 token>
/root/.acme.sh/acme.sh --issue -d virtual-biology-lab.duckdns.org --dns dns_duckdns --server letsencrypt
/root/.acme.sh/acme.sh --install-cert -d virtual-biology-lab.duckdns.org --ecc \
  --fullchain-file /opt/a-single-sentence-story/deploy/certs/vlab-fullchain.pem \
  --key-file /opt/a-single-sentence-story/deploy/certs/vlab-privkey.pem \
  --reloadcmd "docker exec story-admin-web nginx -s reload"
docker exec story-admin-web nginx -t && docker exec story-admin-web nginx -s reload
```

换域名只需替换域名重新签发，并同步修改 nginx-conf 中 `server_name`。

## 验收

```bash
curl -s https://virtual-biology-lab.duckdns.org:39272/api/health   # 本机/外网均应返回 ok
```

## 已知限制

- DuckDNS 子域无法 ICP 备案；要备案+标准 443 需换国内注册商域名。
- GFW 对 SNI 含 `duckdns.org` 的 TLS 握手间歇性重置（时好时坏）。长期运营建议购廉价域名（.top/.xyz）替换，按上文重签即可。
- 安全组 MUST 放行 TCP 39272，否则外网超时（不是拒绝）。
