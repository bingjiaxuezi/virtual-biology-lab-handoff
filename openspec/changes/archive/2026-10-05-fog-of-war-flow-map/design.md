# Design

## Context

学生端运行页当前为「顶部线性里程碑进度条 + 侧栏文字事件轨迹」。上一变更（run-progress-navigation）已落地 `JUMP_TO` 命令、JUMPED_TO 事件与 `run-derive.ts` 推导函数（`visitedNodesOf` 等）。Definition 不存节点坐标；教师端 `apps/studio/src/editor/derive.ts` 用 dagre 自动布局渲染 React Flow。本变更动机见 proposal.md - Why。

## Goals / Non-Goals

- Goals：学生端全景流程图（战争迷雾）取代进度条与文字轨迹；图上读档跳转；复盘页只读全图；移动端可用
- Non-Goals：不改 Definition Schema / Capability Registry / Runtime / API；不动教师端编辑器；不做节点内容预览（迷雾只到标题级）；不做多人/班级视图

## Decisions

1. **渲染方案：`@xyflow/react` 只读 + dagre 自动布局（LR 方向）**——与教师端同一套视觉语言，符合"React Flow 只负责展示"的架构约束；备选：自绘 SVG（放弃，缩放平移/点击命中/视口裁剪都要自造）。`nodesDraggable=false`、`nodesConnectable=false`、`elementsSelectable=true`（用于点击跳转）、`onlyRenderVisibleElements` 保证 76+ 节点性能。
2. **迷雾粒度：节点标题级**。未访问节点渲染为占位框（节点类型图标 + 「???」），真实标题、选项、结果、媒体内容**不进入 DOM**（不用 title/aria-label 暴露，防查看源码剧透）；连线全量可见，两端均已访问的边点亮，其余淡灰。已访问节点显示真实标题，当前节点高亮描边。
3. **布局缓存**：dagre 布局结果按 definition 引用 `useMemo` 缓存；visited/current 变化只改节点 data，不重排布局。
4. **视口策略**：进入新节点后 `setCenter` 把当前节点平滑移入视野（固定可读缩放，不 fitView 整图——76 节点缩全图不可读）；提供 n/N 已探索徽章。
5. **摆放位置**：桌面端地图带在主内容上方、固定高度 220px、横向可滚动缩放（继承进度条的位置语义）；移动端高度 140px，同样在顶部；侧栏/抽屉只留背包（页签取消）。
6. **组件取舍**：删除 `ProgressBar.tsx` 与 `EventTrail.tsx` 文字列表；`summarizeEvent` 中背包所需部分移入 Backpack 或保留在 run-derive；`RunSidePanel` 简化为背包面板（保留移动端抽屉形态）。

## Risks / Trade-offs

- [LR 布局 76 节点横向极长] → 固定缩放 + 当前节点自动居中 + 横向滚动；连线缩短排距
- [React Flow 增加包体积（约 150KB gzip）] → 学生端单页应用可接受；不引入 ELK 等更重布局器
- [触摸端误触未访问节点] → 未访问节点点击无效（无 handler），仅已访问节点可点
- [环路/重访节点只算一次已访问] → visited 为集合语义，与 run-derive 现有实现一致

## Migration Plan

纯前端变更，随常规镜像发布；旧事件流无需迁移（visited 集合从事件流现算）。回滚即重新部署上一镜像。
