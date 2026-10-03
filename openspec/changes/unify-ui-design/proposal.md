# Proposal

## Why

教师端（studio）与学生端（web）各自维护一套互不一致的样式：token 命名不同（studio 用 `--bg/--accent`，web 用 `--color-*`）、组件样式各自为政，登录页、列表页等仍是最朴素的默认风格。同时项目缺少一套可复用的 UI 规范与验收机制，导致每次 UI 调整都是一次性散修，无法沉淀为"任何 AI/开发者都能照做的统一优化机制"。

## What Changes

- 建立 `docs/design/ui-guidelines.md`：统一设计令牌（色彩/间距/圆角/字号/阴影）、组件规范（按钮/表单/面板/表格/空态/加载/错误）、页面布局模式与验收清单（Playwright 截图桌面+移动视口）
- 新增仓库级技能 `.agents/skills/ui-polish/SKILL.md`：把"读规范 → OpenSpec 提案 → 实现 → 截图验收"固化为可复用流程，供后续任何 UI 优化任务调用
- 教师端 UI 统一改造：登录/注册页、实验列表页、编辑器页、运行轨迹页按设计系统重做视觉
- 学生端 UI 对齐：token 命名与教师端统一，目录页/复盘页等未覆盖页面补齐规范
- 不改任何业务行为、API 契约与领域模型

## Capabilities

### New Capabilities

- `ui-design-system`: 项目级 UI 设计系统——设计令牌、组件规范、优化流程机制（规范文档 + 仓库技能 + 截图验收清单），作为所有前端页面的视觉基线与后续 UI 任务的强制约束

### Modified Capabilities

- `teacher-studio`: 新增"界面 MUST 遵循 ui-design-system 设计系统"的要求（登录页、列表页、编辑器、轨迹页的视觉与交互状态规范）
- `student-runtime-ui`: 新增"界面 MUST 遵循 ui-design-system 设计系统"的要求（token 命名统一、目录页/复盘页视觉规范）

## Impact

- 代码：`apps/studio/src/styles.css`、`apps/studio/src/pages/*`、`apps/studio/src/editor/*`；`apps/web/src/styles.css`、`apps/web/src/pages/*`
- 文档：新增 `docs/design/ui-guidelines.md`、`.agents/skills/ui-polish/SKILL.md`
- 依赖：不新增运行时依赖；验收使用已有的浏览器截图能力
- 风险：纯视觉改造，功能回归风险低；以组件测试 + 截图对比验收
