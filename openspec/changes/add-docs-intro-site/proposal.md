# Proposal

## Why

项目「实景数伴」（实景 = 实际拍摄的照片/视频或基于实拍素材由 AI 生成的超逼真画面；数伴 = AI 助教/导学/同学/队友/对手）目前缺少一个对外的介绍入口。访客（评审、合作教师、新加入的开发者）无法快速理解"项目在做什么、有什么好处、怎么使用"。仓库已有完整的 `docs/` 文档体系，但只是裸 Markdown，没有可浏览的在线形态。GitHub Pages 在国内访问不稳定，需要部署在自有腾讯云服务器上。

## What Changes

- 新增 `apps/docs`：基于 Astro Starlight 的静态站点，构建产物为纯静态文件（无服务端运行时）。
- 站点挂在现有域名子路径 `/docs/` 下（`base: '/docs/'`），复用现有 Nginx server 块与 acme.sh 证书，不注册新域名。
- 首页为定制化 Landing 页：项目名称「实景数伴」、一句话定位、"实景"与"数伴"概念解释、核心好处、快速开始入口；UI 必须美观精致，使用 Starlight 官方主题能力与社区现成组件，不手写底层 UI 框架。
- 文档区直接复用仓库现有 `docs/`（product / architecture / domain / design）与 README 内容，整理为带侧边栏导航的使用文档。
- 发布方式采用轻量路径：本地/CI 构建出 `dist` 后 rsync 到服务器 `/usr/share/nginx/vlab-docs/`，由共享 Nginx 的 `location /docs/` 托管；不走 docker 镜像与 CD 流水线（docker/CD 保留给 api/web/studio）。
- 站内所有资源自托管，不依赖 jsDelivr/unpkg 等境外 CDN，保证国内访问稳定。

## Capabilities

### New Capabilities

- `docs-site`: 项目对外介绍与使用文档站点的结构、内容与发布方式，包括 Landing 首页、文档导航、子路径托管与静态发布流程。

### Modified Capabilities

（无）

## Impact

- 新增目录：`apps/docs/`（Astro Starlight 工程，纳入 pnpm workspace）。
- 修改：`pnpm-workspace.yaml`、`deploy/nginx.conf`（增加 `location /docs/` 块）、`deploy/README.md`（补充 docs 站点发布步骤）。
- 新增发布脚本：`deploy/publish-docs.sh`（构建 + rsync dist 到服务器）。
- 不影响 api/web/studio 的运行时与部署流程；不涉及领域模型、Experiment Definition Schema、Capability Registry、Compiler/Runtime、AI 约束或 Provider 接口变化。
- 新依赖均为构建期依赖（astro、@astrojs/starlight 等），运行时零依赖。
