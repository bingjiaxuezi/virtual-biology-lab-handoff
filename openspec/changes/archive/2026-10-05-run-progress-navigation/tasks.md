# Tasks

## 1. Runtime 与事件模型

- [x] 1.1 `experiment-events` 新增 `JUMPED_TO` 事件类型（payload: from/to），测试可构造可序列化
- [x] 1.2 `experiment-runtime` 新增 `JUMP_TO` 命令：校验目标节点在本 Run 已进入集合内；追加 JUMPED_TO 事件；访问栈重建兼容（JUMPED_TO 弹栈至目标）
- [x] 1.3 API dispatch 白名单放行 JUMP_TO；Run 已完成时拒绝
- [x] 1.4 单测：合法跳转 / 未访问节点拒绝 / 已完成拒绝 / 跳转后 BACK 栈行为正确

## 2. 学生端 UI

- [x] 2.1 里程碑进度条组件：最长主路径刻度 + 当前/已访/未达三态 + 横向滚动
- [x] 2.2 EventTrail 重做：节点标题 + 操作摘要（选择/变量/得分变化）+ 当前高亮 + 点击 NODE_ENTERED 跳转
- [x] 2.3 移动端抽屉：≤800px 轨迹改为底部可展开抽屉；进度条横向滚动
- [x] 2.4 实验记录背包：分页签面板，聚合观察记录 / 问答记录 / 关键变量变化，移动端与轨迹共用抽屉页签
- [x] 2.5 组件测试：摘要格式化、进度条三态、跳转交互、抽屉开合、背包聚合

## 3. 验收

- [x] 3.1 `pnpm -r test` / `typecheck` / `lint` / `openspec validate --strict` 全绿
- [x] 3.2 浏览器验收（桌面+390px）：跑小鼠实验，验证进度条推进、轨迹摘要可读、点击历史事件读档、移动端抽屉可用
