#!/usr/bin/env bash
# 本地执行（Git Bash / WSL）：构建镜像并通过 ssh 管道上传到服务器。
# 用法：deploy/build-and-upload.sh [release-tag]
# 前置：本机 Docker 可用（linux/amd64）；已对服务器免密 ssh。
#
# 备选路径（本机无 Docker 时）：把仓库 rsync 到服务器后远端构建——
#   rsync -az --exclude node_modules --exclude .git ./ root@<server>:/opt/virtual-biology-lab/build/
#   ssh root@<server> 'cd /opt/virtual-biology-lab/build && docker build -f apps/api/Dockerfile -t vlab-api:<tag> .'
#
# Windows 注意：向服务器传输/修改脚本时用 base64 方式，避免 PowerShell 换行污染：
#   $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((Get-Content -Raw deploy/activate.sh)))
#   ssh root@<server> "echo $b64 | base64 -d > /opt/virtual-biology-lab/deploy/activate.sh && chmod +x ..."
set -euo pipefail

# 服务器地址不入库：通过环境变量传入，如 VLAB_SERVER=root@<server-ip>
SERVER="${VLAB_SERVER:?请设置 VLAB_SERVER 环境变量（如 root@<server-ip>），服务器地址不入库}"
RELEASE="${1:-$(date +%Y%m%d%H%M%S)}"

for target in api web studio; do
  echo "==> build vlab-$target:$RELEASE"
  docker build -f "apps/$target/Dockerfile" -t "vlab-$target:$RELEASE" .
done

for target in api web studio; do
  echo "==> upload vlab-$target:$RELEASE"
  docker save "vlab-$target:$RELEASE" | gzip | ssh "$SERVER" "gunzip | docker load"
done

echo
echo "已上传 RELEASE=$RELEASE"
echo "服务器上执行发布：/opt/virtual-biology-lab/deploy/activate.sh $RELEASE"
