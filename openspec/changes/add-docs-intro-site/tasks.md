# Tasks

## 1. 工程骨架

- [x] 1.1 在 `apps/docs` 初始化 Astro + Starlight 工程（`base: '/docs'`、中文 locale、站点标题「实景数伴」），纳入 `pnpm-workspace.yaml`
- [x] 1.2 配置 Starlight：侧边栏分组、Pagefind 搜索、深色模式、社交/编辑链接按需要关闭或指向仓库
- [x] 1.3 通过 custom CSS 将 Starlight 主题变量映射到 `packages/design-tokens` 的色值（主色 #0f766e 系、字体族、圆角），桌面与移动断点符合 ui-guidelines

## 2. 首页（Landing）

- [ ] 2.1 用 imagegen 生成 hero 配图（实景生物实验场景 + AI 伙伴氛围，超逼真风格，自托管到 `apps/docs` 静态资源）
- [x] 2.2 实现 splash 首页：项目名「实景数伴」、一句话定位、"实景"与"数伴"概念卡（Starlight CardGrid/Card）、核心好处分节、快速开始 CTA
- [x] 2.3 双视口（1280×800 / 390×844）截图核对：无文字溢出、无元素重叠、hover 态可感知

## 3. 文档区内容

- [x] 3.1 快速开始页：从 README 提炼安装、启动、使用流程
- [x] 3.2 项目介绍分组：product/overview、iteration-1 改写为面向读者的说明
- [x] 3.3 深入分组：architecture、domain（core-model / experiment-definition / capability-registry）、design/ui-guidelines 的导览版
- [x] 3.4 校验全部站内链接、图片资源均以 `/docs/` 前缀加载，搜索可用

## 4. 发布

- [x] 4.1 新增 `deploy/publish-docs.sh`：`pnpm --filter docs build` + rsync dist 到 `$VLAB_SERVER:/usr/share/nginx/vlab-docs/`（沿用 VLAB_SERVER 约定，地址不入库）
- [x] 4.2 `deploy/nginx.conf` 增加 `location /docs/` 块并更新 `deploy/README.md` 发布说明
- [x] 4.3 实机发布到服务器，`https://<域名>/docs/` 双视口验收截图，确认无境外 CDN 请求

## 5. 收尾

- [x] 5.1 `pnpm lint`、`pnpm -r typecheck`、`pnpm -r test` 全绿
- [x] 5.2 更新 README 增加"在线文档"入口说明
- [ ] 5.3 `$openspec-archive-change` 归档本变更
