# Design

## Context

仓库为 pnpm monorepo（apps/packages 结构），已有 `docs/` 中文文档体系与 `packages/design-tokens`（唯一视觉基线：主色 #0f766e 等令牌）。服务器为腾讯云 CVM（2核4G），共享 Nginx + acme.sh 证书，`deploy/nginx.conf` 中 `/` 与 `/studio/` 已分别分配给学生端与教师端。发布走"本地构建 + ssh/rsync 上传"的降级路径已有先例（`deploy/build-and-upload.sh`）。动机见 proposal.md。

## Goals / Non-Goals

**Goals:**
- `apps/docs` 静态站：Landing 首页 + 文档区，一次构建同时满足"介绍"与"使用文档"
- 视觉沿用 design-tokens 令牌配色，通过 Starlight 主题变量覆盖实现，保证与产品 UI 同族且精致
- 纯静态、全自托管、国内访问稳定；发布一条命令完成

**Non-Goals:**
- 不做博客、版本化文档、多语言（仅中文）
- 不接入 docker 镜像/CD 流水线，不动 api/web/studio 的部署
- 不实现评论区、统计埋点等动态功能

## Decisions

1. **框架：Astro + @astrojs/starlight**
   - Starlight 自带侧边栏、全文搜索（Pagefind，构建期生成索引，无境外服务依赖）、深色模式、中文 i18n——正好覆盖文档区全部需求，零自研。
   - 备选 Docusaurus/VitePress：功能相当，但 Astro 生态允许用 `.astro` 组件自定义首页且产物最轻；VitePress 首页定制上限较低，Docusaurus 偏重。

2. **首页：Starlight 自定义 splash 模板 + design-tokens 配色**

   **风格参照站**：[docs.flojoy.ai](https://docs.flojoy.ai/)（同为可视化实验/工程类项目，蓝绿主色、hero + 卡片分区结构），首页布局与气质对齐该站。
   - 首页用 Starlight 的 `splash` 模板，hero 区展示「实景数伴」+ 一句话定位 + CTA 按钮；下方用 CardGrid/Card 现成组件排布"实景""数伴"概念卡与核心好处。
   - 通过 Starlight 的 custom CSS 将 `--sl-color-accent-*` 等变量映射到 design-tokens 的色值（主色 #0f766e 系），视觉与产品一致；只引令牌值，不新建造型体系。
   - hero 配图：用 imagegen 生成一张"实景生物实验 + AI 伙伴"主题的高质量配图，不用 SVG 插画。

3. **文档内容组织**
   - 快速开始（来自 README）、产品概览、迭代范围、架构、领域模型、能力注册表、UI 规范，按侧边栏分组；内容从 `docs/` 复制/改写为面向"读者"的说明，而不是软链（保持站点自包含）。

4. **部署：`base: '/docs/'` + rsync 静态发布**
   - `astro.config.mjs` 设 `base: '/docs'`，Nginx 增加 `location /docs/ { alias /usr/share/nginx/vlab-docs/; try_files $uri $uri/ /docs/index.html; }`（Starlight 产物为目录式 HTML，alias 直接命中）。
   - 新增 `deploy/publish-docs.sh`：本地 `pnpm --filter docs build` 后 `rsync -az --delete apps/docs/dist/ $VLAB_SERVER:/usr/share/nginx/vlab-docs/`，沿用 VLAB_SERVER 环境变量约定，服务器地址不入库。
   - 不建 Dockerfile：静态站无运行时，nginx 由现有共享实例托管。

## Risks / Trade-offs

- **docs/ 内容复制后双源维护**：文档更新需同步到 apps/docs。缓解：tasks 中约定"站点内容以 docs/ 为源、构建前同步"的操作约定；后续可演进为构建期自动拷贝。
- **手动 rsync 无回滚**：静态站回滚 = 重新发布旧版，风险低，可接受。
- **Astro/Starlight 是新构建依赖**：仅构建期引入，运行时零影响。
- **Pagefind 搜索索引增大产物体积**：文档量小，可忽略。
