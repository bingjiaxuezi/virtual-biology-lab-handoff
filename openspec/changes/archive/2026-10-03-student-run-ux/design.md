# Design：学生端运行页易用性统一版

## 1. BACK 命令语义（experiment-runtime）

- `RuntimeCommand` 新增 `{ type: 'BACK' }`。
- 运行时维护"节点访问历史栈"：每次成功 TRANSITION 前把当前节点压栈。BACK 弹出栈顶并 `RESTORE_TO` 该节点。
- **不回滚**变量、分数、事件：历史是事实，回退只是"回到那个节点重新看/重新答"。追加事件 `STEPPED_BACK`（payload：`{ from, to }`）。
- 限制：历史栈为空（START 之后未推进过）、Run 已 COMPLETED/ABORTED 时 BACK 被拒并返回原因。
- 回退后在 VARIABLE_INPUT 重新 SET_VARIABLE 是合法的：产生新的 VARIABLE_CHANGED；计分防刷见下。

## 2. SCORE 幂等（experiment-runtime）

- RunRecord 增加 `scoredRuleIds: Set<string>`；`evaluateRules` 应用 `SCORE` 效果前检查该 Rule 本 Run 是否已计分，已计分则跳过该效果（其余 SET/ADD/SUBTRACT 照常）。
- 语义：SCORE 是"成就解锁"，每规则一次；变量效果是"状态推导"，随变量变化照常重算。
- 酶温度实验回归：temperature 80→DENATURED +10；再调回 37→sampleStatus 恢复 NORMAL（SET 仍生效），r_normal_temp 的 SCORE 只加一次。

## 3. 事件类型（experiment-events）

- `experimentEventTypeSchema` 追加 `'STEPPED_BACK'`；`docs/domain/runtime-event-model.md` 同步一行说明。

## 4. 统一操作栏（student-runtime-ui）

新增共享组件 `NodeActionBar`：

```
[← 回退]                                     [主按钮]
```

- 回退按钮固定最左，无历史时禁用（title 提示"已在起点"）；
- 主按钮固定最右，两步态：交互节点第一态用节点动词（提交回答/提交观察/确认/执行操作/查看结果），完成后原位变为"继续"；纯展示节点（MEDIA/START）直接显示"继续"；
- 主按钮尺寸统一（min-height 40px、min-width 120px），busy 时禁用并显示"处理中…"；
- 各 NodeView 删除自带 button-row，改为渲染 `NodeActionBar`；操作栏上方右对齐显示"第 N 步"（N = NODE_ENTERED 事件数，由 RunPage 传入）。

## 5. 媒体与视觉规格（student-runtime-ui）

- `.media-content`：宽度 100%、`aspect-ratio: 16/9`（图片 auto）、`max-height: 70vh`、保留 `object-fit: contain` 与深色底；图片 `cursor: zoom-in`，点击新标签打开 content URL 看原图；
- `.run-layout` 主列加宽：`grid-template-columns: minmax(0, 1fr) 320px`，`app-main` max-width 1080 → 1280；侧栏 `position: sticky; top: 24px`；
- 面板基线：`node-panel` 标题统一 h2/18px、正文 14px、操作栏上边框分隔线、面板 padding 统一 24px；QUESTION/OBSERVATION 的选项与文本域间距统一；
- 移动端（≤800px）保持单列，操作栏按钮等宽。

## 6. 不做的事

- 不改教师端 Studio 的交互（本次只做学生端）；
- 回退不做"撤销事实"（事件不删、分数不回滚）；
- 不引入分页/断点续学等新概念。
