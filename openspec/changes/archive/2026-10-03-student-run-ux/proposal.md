# 学生端运行页易用性统一版

## Why

学生端 Run 页当前存在三类易用性问题（用户实测反馈）：

- **操作按钮位置与措辞不统一**：确认/提交回答/执行操作/查看结果/继续分散在各节点组件的不同位置，两步操作（先确认再继续）的按钮互换位置，学生需要反复寻找；
- **无法回退**：看错了、想重看视频或改选择时无路可退，只能硬着头皮往下走；
- **媒体展示太小**：视频上限 `max-height: 420px`，主列偏窄，操作演示视频看不清细节；各节点面板视觉规格不一致。

## What Changes

- **统一操作栏**（`student-runtime-ui`）：所有节点底部统一操作区，布局固定为 `[← 回退] … [主按钮]`；主按钮两步态统一为"节点动作（提交/确认/执行/查看结果）→ 继续"，位置与尺寸不变。
- **回退能力**（`experiment-runtime` + `experiment-events` + `student-runtime-ui`）：新增 `BACK` 命令，将当前节点指针移回上一个访问的节点（复用 RESTORE_TO 机制）；**不回滚变量/分数/事件**，追加一条 `STEPPED_BACK` 事件（Event Log append-only 不被破坏）；START 节点与已完成 Run 不可回退。
- **计分幂等**（`experiment-runtime`）：`SCORE` 效果每条 Rule 每个 Run 至多生效一次，防止经回退重答刷分；`SET/ADD/SUBTRACT` 行为不变（保持"状态推导"语义）。
- **媒体与视觉**（`student-runtime-ui`）：媒体区 16:9 自适应、占满面板宽度、上限提升到约 70vh；图片支持点击查看原图；节点面板标题层级/间距/按钮尺寸统一；事件轨迹与 AI 面板 sticky；操作栏上方显示"第 N 步"进度提示。

## Capabilities

### New Capabilities

（无新增能力域）

### Modified Capabilities

- `student-runtime-ui`：统一操作栏、回退入口、媒体展示规格、面板视觉基线。
- `experiment-runtime`：新增 BACK 命令语义；SCORE 效果幂等。
- `experiment-events`：新增 `STEPPED_BACK` 事件类型。

## 影响

- 事件类型枚举新增成员，向后兼容（旧事件仍可解析）；
- BACK 只移动节点指针，不触碰事件与变量事实，评审轨迹依然完整可信；
- SCORE 幂等对既有实验无影响（现有实验不存在回退路径，每规则本来只触发一次）；
- 不涉及 Schema/Definition 结构变化，既有实验定义无需迁移。
