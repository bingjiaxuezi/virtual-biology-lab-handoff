# UI 设计规范

本文件是 AI 生物仿真实验平台所有前端页面（教师端 studio、学生端 web）的**唯一视觉基线**。任何 UI 新建或改造 MUST 遵循本规范；任何"优化 UI"类任务 MUST 先读本文件。

## 1. 设计令牌（Design Tokens）

令牌的单一真值源是 `packages/design-tokens/tokens.css`，两端通过 `@virtual-biology-lab/design-tokens` 引入。**禁止**在组件或页面样式中写死色值/间距值；需要新值时先扩展令牌包。

### 色彩

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--color-bg` | #f6f7f9 | 页面背景 |
| `--color-surface` | #ffffff | 面板、卡片、输入框底 |
| `--color-surface-hover` | #f0f4f3 | 行/条目 hover 底色 |
| `--color-surface-sunken` | #f8fafc | 凹陷区域（代码块、只读区） |
| `--color-border` | #d9dee4 | 描边、分隔线 |
| `--color-text` | #1d2733 | 正文 |
| `--color-text-muted` | #5b6b7c | 次要文字、表头、说明 |
| `--color-primary` | #0f766e | 主操作、强调 |
| `--color-primary-hover` | #115e59 | 主色 hover |
| `--color-primary-soft` | #e6f4f2 | 主色浅底（选中态、徽标） |
| `--color-on-primary` | #ffffff | 主色按钮上的文字 |
| `--color-danger` / `--color-danger-soft` / `--color-danger-border` | #b42318 / #fef2f2 / #f0c4bd | 危险操作、错误 |
| `--color-warning` / `--color-warning-soft` | #b45309 / #fdf4e7 | 提醒、强调展示 |
| `--color-success` / `--color-success-soft` | #067647 / #ecf8f1 | 成功态 |
| `--color-info` / `--color-info-soft` | #2f5cc4 / #e8eefc | 信息提示 |
| `--color-focus-ring` | rgba(15,118,110,.35) | 键盘聚焦环 |
| `--color-media-backdrop` | #101418 | 视频/图片深色衬底 |
| `--color-overlay` | rgba(15,23,42,.45) | 弹窗遮罩 |

### 间距 / 圆角 / 字号 / 阴影

- 间距刻度：`--space-1` 4px → `--space-8` 32px（4 的倍数），组件内距与组件间距只允许取刻度值
- 圆角：`--radius-sm` 4px（徽标）、`--radius-md` 6px（按钮、输入框）、`--radius-lg` 8px（面板、卡片）
- 字号：`--font-xs` 12 / `--font-sm` 13 / `--font-md` 14（正文基准）/ `--font-lg` 16 / `--font-xl` 18 / `--font-2xl` 22
- 阴影：仅 `--shadow-card` 一档，只用于需要浮层感的卡片
- 字体族：`--font-family`（Segoe UI / PingFang SC / Microsoft YaHei / system-ui）

## 2. 组件规范

基样式在 `packages/design-tokens/components.css`，全部以 class 提供：

- **按钮**：`.btn` + `btn-primary`（实心主色，每屏至多一个主操作）/ `btn-secondary`（描边，次要与工具操作）/ `btn-danger`（删除等危险操作）。MUST 有可感知的 hover、disabled（45% 透明度）、focus-visible（聚焦环）
- **表单**：`.input` + `.label`；聚焦时显示聚焦环，禁用态 60% 透明度
- **面板**：`.panel`（白底 + 描边 + 8px 圆角 + 卡片阴影）；页面区块用整幅分带或无边距布局，禁止面板套面板
- **表格**：`.table`（12px muted 表头、行分隔线、行 hover 底色）
- **空态**：`.empty-state`（居中说明 + 一个主操作按钮）
- **错误**：`.error-banner`（浅红底深红字）；表单错误内联展示且预留高度，布局不得跳动
- **徽标**：`.badge` / `.badge-muted`

## 3. 页面模式

- **登录/注册**：居中卡片（380px），顶部品牌区（产品名 + 端别），模式分段切换，错误内联
- **列表页**：顶栏（页面标题 + 主操作），表格或卡片网格，空列表 MUST 用 `.empty-state`
- **运行/工作台页**：主区 + 固定侧栏（≥801px 时侧栏 sticky），操作按钮统一收于底部操作栏
- **学生端媒体**：视频面板全宽 16:9、最大高度 ≥60vh；图片点击新标签看原图

## 4. 验收清单（每次 UI 变更必做）

1. `pnpm lint`、`pnpm -r typecheck`、`pnpm -r test` 全绿
2. 桌面视口（1280×800）与移动视口（390×844）截图核对受影响页面
3. 截图中不得有：文字溢出容器、元素重叠、对比度不可读、按钮无 hover/disabled 区分
4. 关键页面基线：studio 登录 / studio 列表 / studio 编辑器 / web 目录 / web 运行 / web 复盘

## 5. 优化流程（强制）

任何 UI 任务按 `.agents/skills/ui-polish/SKILL.md` 执行：读本规范 → OpenSpec 提案 → 实现（只引令牌）→ 双视口截图验收 → 归档。
