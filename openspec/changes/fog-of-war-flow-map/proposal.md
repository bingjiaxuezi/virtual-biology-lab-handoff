# Proposal

## Why

上一迭代上线的线性里程碑进度条对分支多的真实实验（小鼠实验 76 节点、含条件分支与支线）表达力不足：学生看不到"前面还有几个岔路口"、看不到自己走了哪条分支。用户反馈希望学生端直接呈现与教师端一致的全景流程图，未探索区域以"战争迷雾"方式保留轮廓但隐藏内容，让进度指示与流程记录合并为同一张图。

## What Changes

- 学生端运行页顶部渲染**全景流程图（战争迷雾）**：完整节点图结构可见（节点轮廓 + 分支连线，与教师端结构一致），未访问节点迷雾化（占位框 + 类型图标，标题与内容隐藏），已访问节点显示标题、当前节点高亮、走过路径的连线点亮
- 点击已访问节点发出 `JUMP_TO` 读档（复用现有命令，无 Runtime/事件模型变更）
- **移除**线性里程碑进度条组件与文字版事件轨迹列表（二者由流程图取代）；背包面板保留
- 复盘页展示同一张图（Run 已完成，全图去迷雾、只读）
- 移动端：地图带可缩放平移、当前节点自动入视；背包保留在底部抽屉

假设（实现前可修正）：迷雾节点显示类型图标与占位标题「???」，DOM 中不出现真实标题防泄露；桌面端地图带固定高度约 220px、移动端约 140px，横向布局（LR）可滚动缩放。

## Capabilities

### New Capabilities

（无新能力，全部为既有能力的规格调整）

### Modified Capabilities

- `student-runtime-ui`：「里程碑进度条」「事件轨迹实时可见」两条需求移除，由新增的「战争迷雾流程图」需求取代；「轨迹点击跳转（读档）」改为图上节点点击；「移动端轨迹与进度适配」改为地图带与背包抽屉适配

## Impact

- 代码：`apps/web`（新增 FlowMap/FogNode 组件与布局推导，删除 ProgressBar、EventTrail 文字列表，RunSidePanel 页签调整为背包，RunPage/ReviewPage 接线，样式）
- 依赖：`apps/web` 新增 `@xyflow/react`、`dagre`（与教师端同方案，Definition 无坐标，前端自动布局）
- 不变更：Experiment Definition Schema、Capability Registry、Runtime 命令/事件模型、API 接口、教师端
- 复用：`visitedNodesOf` 等 `run-derive` 推导函数、`JUMP_TO` 命令、`summarizeEvent` 中背包所需部分
