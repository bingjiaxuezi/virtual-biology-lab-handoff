# Tasks

## 1. 依赖与布局推导

- [x] 1.1 `apps/web` 引入 `@xyflow/react`、`dagre`（含类型包，版本与 studio 对齐），`pnpm install` 更新 lockfile
- [x] 1.2 新增 `apps/web/src/lib/flow-map.ts`：definition → dagre LR 布局（节点尺寸估算、ranksep/nodesep 紧凑化）→ React Flow nodes/edges；visited/current/边点亮状态从事件流注入 data
- [x] 1.3 单测：布局节点数与 definition 一致；visited 集合正确映射；环路/重访去重

## 2. 战争迷雾流程图组件

- [x] 2.1 `FlowMap` 组件：只读 React Flow（禁拖拽/连线），自定义 FogNode（未访问=类型图标+「???」，已访问=真实标题，当前=高亮描边）；迷雾节点真实标题不进入 DOM（无 title/aria-label）
- [x] 2.2 边样式：两端均已访问点亮，其余淡灰；已探索计数徽章 n/N
- [x] 2.3 当前节点自动入视：`setCenter` 平滑定位（固定缩放，不 fitView）；点击进入新节点后触发
- [x] 2.4 点击已访问节点 → `JUMP_TO`；迷雾节点不可点；已完成 Run 全图去迷雾只读
- [x] 2.5 组件测试：迷雾不泄露标题、点击跳转、完成态只读、计数徽章

## 3. 页面接线与清理

- [x] 3.1 RunPage：顶部地图带替换 ProgressBar（桌面 220px / 移动 140px）；`RunSidePanel` 简化为背包面板（保留移动端抽屉）；删除 `EventTrail.tsx`、`ProgressBar.tsx`
- [x] 3.2 ReviewPage：渲染去迷雾只读流程图 + 背包
- [x] 3.3 样式：地图带、FogNode 三态、边两态、徽章；移动端无横向溢出（延续 minmax(0,1fr) 约束）
- [x] 3.4 更新既有测试（flow.test.tsx 等）去除轨迹/进度条断言，改断言地图带

## 4. 验收

- [x] 4.1 `pnpm -r test` / `typecheck` / `lint` / `openspec validate --strict` 全绿
- [x] 4.2 浏览器验收（桌面 + 390px）：小鼠实验跑 5+ 节点，验证迷雾占位、探索解锁、路径点亮、点击读档、移动端平移缩放与背包抽屉
