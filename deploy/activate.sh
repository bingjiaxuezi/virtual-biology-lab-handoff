#!/bin/sh
# 在服务器上执行：发布指定版本的 vlab-api。
# 用法：/opt/virtual-biology-lab/deploy/activate.sh <release-tag>
# 前置：镜像已通过 build-and-upload.sh 上传；/opt/virtual-biology-lab/.env 已就绪（权限 600）。
set -eu

RELEASE="${1:?用法: activate.sh <release-tag>}"
APP_ROOT="/opt/virtual-biology-lab"
IMAGE="vlab-api:$RELEASE"
CONTAINER="vlab-api"
NETWORK="story-network"
HEALTH_URL="http://vlab-api:3000/api/health"

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "镜像 $IMAGE 不存在，请先运行 build-and-upload.sh 上传" >&2
  exit 1
fi

# 备份当前配置与版本指针
BACKUP_DIR="$APP_ROOT/backups/$(date +%Y%m%d%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$APP_ROOT/.env" "$BACKUP_DIR/.env"
PREV_IMAGE="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}' 2>/dev/null || true)"
echo "$PREV_IMAGE" > "$BACKUP_DIR/prev-image.txt"
echo "上一版本镜像: ${PREV_IMAGE:-<none>}"

# 迁移先行：失败即中止，旧容器保持运行
echo "==> prisma migrate deploy"
if ! docker run --rm --network "$NETWORK" --env-file "$APP_ROOT/.env" \
    --entrypoint ./node_modules/.bin/prisma "$IMAGE" migrate deploy; then
  echo "数据库迁移失败，发布中止，旧容器保持运行" >&2
  exit 1
fi

# 重建 API 容器
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d --name "$CONTAINER" \
  --restart unless-stopped \
  --network "$NETWORK" --network-alias "$CONTAINER" \
  --env-file "$APP_ROOT/.env" \
  -p 127.0.0.1:13000:3000 \
  -v vlab-storage:/app/storage \
  "$IMAGE"

# 健康检查（复用旧项目的 nginx:alpine wget 模式）
healthy=0
for attempt in $(seq 1 30); do
  if docker run --rm --network "$NETWORK" nginx:alpine \
      wget -qO- --timeout=3 "$HEALTH_URL" >/tmp/vlab-health.json 2>/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done

if [ "$healthy" -ne 1 ]; then
  echo "健康检查失败，输出新容器日志并回滚" >&2
  docker logs --tail 100 "$CONTAINER" >&2
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if [ -n "$PREV_IMAGE" ]; then
    docker run -d --name "$CONTAINER" \
      --restart unless-stopped \
      --network "$NETWORK" --network-alias "$CONTAINER" \
      --env-file "$APP_ROOT/.env" \
      -p 127.0.0.1:13000:3000 \
      -v vlab-storage:/app/storage \
      "$PREV_IMAGE"
    echo "已回滚到 $PREV_IMAGE" >&2
  else
    echo "无上一版本可回滚，容器保持停止" >&2
  fi
  exit 1
fi

cat /tmp/vlab-health.json
echo
docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}' | grep vlab || true
echo "发布完成: $IMAGE"
