# syntax=docker/dockerfile:1
# API 生产镜像。构建上下文必须是仓库根目录：
#   docker build -f apps/api/Dockerfile -t vlab-api:<tag> .

FROM node:20-alpine AS base
# Prisma 在 alpine 上需要 openssl
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app

# ── 构建阶段：安装全量依赖并编译 workspace ──
FROM base AS build
# 仅拷贝依赖清单以利用层缓存
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/studio/package.json apps/studio/
COPY packages/capability-registry/package.json packages/capability-registry/
COPY packages/experiment-events/package.json packages/experiment-events/
COPY packages/experiment-runtime/package.json packages/experiment-runtime/
COPY packages/experiment-schema/package.json packages/experiment-schema/
COPY packages/experiment-validator/package.json packages/experiment-validator/
# 本地 .npmrc 的 store-dir 是 Windows 绝对路径，容器内改写为 Linux 路径
RUN sed -i 's|^store-dir=.*|store-dir=/pnpm-store|' .npmrc && pnpm install --frozen-lockfile
# 拷贝源码并构建（pnpm 拓扑序：先 packages 后 api）
COPY packages/ packages/
COPY apps/api/ apps/api/
RUN pnpm -r --filter "@virtual-biology-lab/api..." build
# 产出仅含生产依赖的独立目录；在目录内重新 generate，确保 Prisma 引擎匹配 linux-musl
RUN pnpm deploy --filter "@virtual-biology-lab/api" --prod --legacy /prod/api
RUN cd /prod/api && DATABASE_URL="postgresql://build-placeholder" ./node_modules/.bin/prisma generate

# ── 运行时阶段：仅生产依赖 + 编译产物 ──
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=build /prod/api ./
COPY deploy/docker-entrypoint-api.sh ./
RUN chmod +x docker-entrypoint-api.sh
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1 || exit 1
ENTRYPOINT ["./docker-entrypoint-api.sh"]
