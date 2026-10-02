# syntax=docker/dockerfile:1
# 教师端构建镜像（生产 base 为 /studio/）。构建上下文必须是仓库根目录：
#   docker build -f apps/studio/Dockerfile -t vlab-studio:<tag> .
# 与 web 相同：镜像便于独立预览；生产由共享 Nginx 托管提取出的 dist。

FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/studio/package.json apps/studio/
COPY packages/capability-registry/package.json packages/capability-registry/
COPY packages/experiment-events/package.json packages/experiment-events/
COPY packages/experiment-runtime/package.json packages/experiment-runtime/
COPY packages/experiment-schema/package.json packages/experiment-schema/
COPY packages/experiment-validator/package.json packages/experiment-validator/
RUN sed -i 's|^store-dir=.*|store-dir=/pnpm-store|' .npmrc && pnpm install --frozen-lockfile
COPY packages/ packages/
COPY apps/studio/ apps/studio/
RUN pnpm -r --filter "@virtual-biology-lab/studio..." build

FROM nginx:alpine
COPY --from=build /app/apps/studio/dist /usr/share/nginx/html
