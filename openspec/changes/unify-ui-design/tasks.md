# Tasks

## 1. 设计令牌包

- [x] 1.1 新建 `packages/design-tokens`（`tokens.css` + `components.css` + package.json），纳入 pnpm workspace
- [x] 1.2 studio 与 web 入口引入令牌包；两端 `styles.css` 删除自有 `:root` 令牌，全部改引统一变量名
- [x] 1.3 扫描两端样式表，清除写死色值（全部改引令牌）

## 2. 规范文档与优化机制

- [x] 2.1 编写 `docs/design/ui-guidelines.md`（令牌表/组件规范/页面模式/双视口验收清单）
- [x] 2.2 编写 `.agents/skills/ui-polish/SKILL.md`（读规范 → 提案 → 实现 → 截图验收的固化流程）
- [x] 2.3 README 或 AGENTS 开发文档中登记该机制入口

## 3. 教师端 UI 统一

- [x] 3.1 登录页：品牌区+居中卡片+分段切换+内联错误不跳动
- [x] 3.2 实验列表页：顶栏/表格/行操作按钮/空态按规范重做
- [x] 3.3 编辑器页与运行轨迹页：工具栏、侧栏、校验面板统一面板与按钮档次

## 4. 学生端 UI 对齐

- [x] 4.1 目录页：实验卡片网格 + 空态
- [x] 4.2 复盘页：得分/结论突出 + 事件列表规范化
- [x] 4.3 运行页沿用统一操作栏，核对按钮档次与面板样式

## 5. 验收

- [x] 5.1 组件测试全绿；`pnpm lint` / `pnpm -r typecheck` / `pnpm -r test` / `openspec validate --strict` 通过
- [x] 5.2 双视口（1280/390）截图验收 6 个关键页面：studio 登录/列表/编辑器，web 目录/运行/复盘（1280 截图逐页验收；390 视口工具受限，改为 CSS 审计 + 移动端媒体查询修复：登录卡弹性宽度、编辑器/弹窗堆叠、表格横向滚动）
