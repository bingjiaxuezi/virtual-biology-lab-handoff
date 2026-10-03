# syntax=docker/dockerfile:1
# 学生端构建镜像。构建上下文必须是仓库根目录：
#   docker build -f apps/web/Dockerfile -t vlab-web:<tag> .
# 最终镜像基于 nginx:alpine，便于独立预览；生产部署时由发布流程将 dist
# 提取到共享 Nginx（story-admin-web）托管，不单独运行本镜像。

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
# postinstall 会执行 prisma generate，需先拷贝 schema
COPY apps/api/prisma apps/api/prisma
RUN sed -i 's|^store-dir=.*|store-dir=/pnpm-store|' .npmrc && pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
# 过滤器的 ... 后缀会先构建 web 依赖的 workspace 包
RUN pnpm -r --filter "@virtual-biology-lab/web..." build

FROM nginx:alpine
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
