---
name: ui-polish
description: 统一优化本项目（AI 生物仿真实验平台）的前端 UI。当用户要求优化、美化、统一界面样式（教师端 studio / 学生端 web，含登录页、列表页、编辑器、运行页等）时使用。强制遵循 docs/design/ui-guidelines.md 与 OpenSpec 流程。
---

# UI Polish · 项目 UI 统一优化流程

## 强制流程

1. **读规范**：先完整读 `docs/design/ui-guidelines.md`。它是唯一视觉基线。
2. **走 OpenSpec**：任何 UI 变更先创建 Change Proposal（`$openspec-propose`），用户确认后用 `$openspec-apply-change` 实现，验收后 `$openspec-archive-change` 归档。与 AGENTS.md 的 OpenSpec 工作流一致。
3. **只用令牌**：样式只允许引用 `packages/design-tokens` 的 CSS 变量与 `components.css` 的组件 class。发现缺令牌时，先在 `tokens.css` 扩展并同步更新规范文档，禁止写死色值。
4. **双视口验收**：实现后用浏览器在 1280×800 与 390×844 两种视口截图核对受影响页面，确认无文字溢出、元素重叠、不可读对比度。
5. **全量验证**：`pnpm lint`、`pnpm -r typecheck`、`pnpm -r test`、`openspec validate <change> --strict` 全过后才能归档。

## 改造要点速查

- 两端（studio / web）令牌命名一致，均来自 design-tokens 包；页面样式只放布局与特有样式
- 按钮统一三档：`btn-primary` / `btn-secondary` / `btn-danger`；每屏至多一个主按钮
- 操作类按钮统一收于底部操作栏（学生端用 `NodeActionBar`，教师端用同等布局约定）
- 空列表/空面板 MUST 用 `.empty-state`；表单错误内联且预留高度
- 学生端媒体：视频全宽 16:9（≥60vh），图片点击新标签看原图

## 参考页面基线

studio：登录 / 实验列表 / 编辑器 / 学生轨迹；web：目录 / 运行 / 复盘。改动任一页面后更新规范文档的对应描述。
