# Spec Delta

## Purpose

为「实景数伴」项目提供对外的在线介绍页与使用文档站点，让访客快速理解项目定位、价值与使用方法，并在自有服务器上以 `/docs/` 子路径稳定提供国内可访问的静态内容。

## ADDED Requirements

### Requirement: Landing 首页

站点 SHALL 提供一个视觉精美的首页，首屏展示项目名称「实景数伴」与一句话定位，并解释"实景"（实拍照片/视频或基于实拍素材的 AI 超逼真画面）与"数伴"（AI 助教/导学/同学/队友/对手）两个核心概念。首页 MUST 提供进入使用文档的明显入口。

#### Scenario: 访客打开站点首页

- **WHEN** 访客访问站点根路径
- **THEN** 首屏可见项目名称、一句话定位、"实景"与"数伴"概念说明，以及进入文档的按钮

#### Scenario: 移动端访问首页

- **WHEN** 访客使用手机浏览器访问首页
- **THEN** 布局自适应无横向滚动，文字不溢出、不互相遮挡

### Requirement: 使用文档区

站点 SHALL 提供带侧边栏导航的文档区，内容复用仓库 `docs/`（product、architecture、domain、design）与 README，教会用户如何使用平台。文档区 MUST 支持全文搜索与深色模式。

#### Scenario: 浏览文档

- **WHEN** 访客点击首页"快速开始"入口
- **THEN** 进入文档首页并显示分层侧边栏导航

#### Scenario: 搜索文档

- **WHEN** 访客在搜索框输入关键词
- **THEN** 返回匹配的文档条目并可跳转

### Requirement: 子路径托管与静态发布

站点 SHALL 构建为纯静态产物，以 `/docs/` 为 base 路径部署在现有域名的共享 Nginx 下，复用现有证书。发布 MUST 采用"构建 + rsync dist 到服务器"的轻量方式，不引入 docker 镜像或接入 api/web/studio 的 CD 流水线。

#### Scenario: 构建产物自包含

- **WHEN** 执行站点构建
- **THEN** 产物为纯静态文件，所有资源自托管，不引用 jsDelivr/unpkg 等境外 CDN

#### Scenario: 通过子路径访问

- **WHEN** 站点发布到服务器后访问 `https://<现有域名>/docs/`
- **THEN** 页面正常渲染且站内链接、静态资源均以 `/docs/` 为前缀正确加载

### Requirement: 视觉质量

站点 UI MUST 美观精致并遵循 `docs/design/ui-guidelines.md` 的设计约束，优先使用 Starlight 官方主题能力与成熟社区组件，不自行实现底层 UI 框架。站内文字 MUST 使用中文。

#### Scenario: 设计一致性检查

- **WHEN** 站点完成开发进行验收
- **THEN** 配色、字体、间距符合 ui-guidelines，桌面与移动端截图检查无文字溢出或元素重叠
