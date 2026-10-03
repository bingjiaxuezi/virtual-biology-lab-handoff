# Design

## 技术决策

### 令牌单一真值源：`packages/design-tokens`

两端各自复制 `:root` 变量必然漂移。新建 workspace 包 `@virtual-biology-lab/design-tokens`，内含：

- `tokens.css`：全部设计令牌（色彩/间距/圆角/字号/阴影/聚焦环）
- `components.css`：跨端通用的组件基样式（按钮/输入/面板/表格/空态/错误横幅）

两端在入口 `import '@virtual-biology-lab/design-tokens/tokens.css'`，页面特有样式仍留在各自 `styles.css` 且只允许引用令牌变量。不引入 Tailwind/CSS-in-JS——保持零新运行时依赖，纯 CSS 变量方案对两个 Vite 应用最直接。

### 色板

沿用现有青绿色主色（两端已事实一致 `#0f766e`），补齐语义令牌，避免单色界面：

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--color-bg` | #f6f7f9 | 页面背景 |
| `--color-surface` | #ffffff | 面板/卡片 |
| `--color-border` | #d9dee4 | 描边 |
| `--color-text` | #1d2733 | 正文 |
| `--color-text-muted` | #5b6b7c | 次要文字 |
| `--color-primary` / `-hover` | #0f766e / #115e59 | 主操作 |
| `--color-danger` | #b42318 | 危险操作/错误 |
| `--color-warning` | #b45309 | 提醒强调 |
| `--color-success` | #067647 | 成功态 |
| `--color-focus-ring` | rgba(15,118,110,.35) | 聚焦环 |

间距刻度 4/8/12/16/20/24/32，圆角 4/6/8，字号 12/13/14/16/18/22，阴影仅一档卡片投影。

### 组件规范（components.css）

- 按钮三档：`btn-primary`（实心主色）、`btn-secondary`（描边）、`btn-danger`（红色描边），统一 8px×16px 内边距、6px 圆角、hover/disabled/focus-visible 状态
- 表单：输入框统一 8px×10px、6px 圆角、focus 聚焦环；label 13px muted
- 面板/卡片：白底、1px 描边、8px 圆角、16-24px 内边距
- 表格：表头 12px muted、行分隔线、行 hover 底色
- 空态：居中图标位+说明文字+主操作按钮；错误横幅：浅红底+深红字

### 页面改造点

- **登录页**：居中卡片 380px，顶部产品名「生物仿真实验平台」+「教师端」副标，登录/注册分段切换，错误内联预留固定高度避免跳动
- **实验列表页**：顶栏（标题+搜索位+新建主按钮），表格行操作按钮收敛为 编辑/发布/学生运行/删除 图标化或描边按钮，空列表展示规范空态
- **编辑器页**：工具栏、侧栏面板、校验面板统一面板样式与按钮档次
- **学生目录页**：实验卡片网格（标题/发布时间/开始按钮），空目录空态
- **学生复盘页**：得分与结论突出展示，事件列表复用表格/面板规范

### 优化机制：`ui-polish` 技能

`.agents/skills/ui-polish/SKILL.md` 固化流程：读 `docs/design/ui-guidelines.md` → 判断是否需要 OpenSpec 提案 → 实现（只用令牌变量）→ 双视口（1280/390）截图验收 → 归档。验收清单写入规范文档附录。

## 验收方式

- 组件测试保持全绿（视觉改造不改行为断言，class 更名需同步测试）
- 双视口截图核对 6 个关键页面：studio 登录/列表/编辑器，web 目录/运行（媒体节点）/复盘
- `pnpm lint`、`pnpm -r typecheck`、`pnpm -r test`、`openspec validate --strict` 全过
