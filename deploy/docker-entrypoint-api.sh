#!/bin/sh
# API 容器入口：先执行数据库迁移，失败则非零退出（不启动服务）
set -e

echo "[entrypoint] prisma migrate deploy"
./node_modules/.bin/prisma migrate deploy

echo "[entrypoint] start api"
exec node dist/main.js
