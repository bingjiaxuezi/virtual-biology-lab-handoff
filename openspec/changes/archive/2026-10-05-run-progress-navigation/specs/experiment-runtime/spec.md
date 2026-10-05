# experiment-runtime Specification Delta

## ADDED Requirements

### Requirement: 节点跳转命令（JUMP_TO）
学生 MUST 能将 Run 导航到本 Run 中已进入过的任意节点（读档）；目标节点未访问过或 Run 已结束时 MUST 拒绝并说明原因；跳转 MUST NOT 回滚变量、分数或删除事件，MUST 追加 JUMPED_TO 事实事件；访问栈重建逻辑 MUST 将 JUMPED_TO 解释为弹栈至目标节点，保证跳转后 BACK 行为正确。

#### Scenario: 合法跳转
- **WHEN** Run 依次进入 A→B→C，学生跳转到 A
- **THEN** 追加 JUMPED_TO{from:C,to:A}，currentNodeId 变为 A，变量与分数保持不变

#### Scenario: 未访问节点拒绝
- **WHEN** 学生试图跳转到从未进入的节点
- **THEN** 拒绝且不产生事件，界面状态不变

#### Scenario: 已完成 Run 拒绝跳转
- **WHEN** Run 已完成后发出 JUMP_TO
- **THEN** 拒绝且不产生事件

#### Scenario: 跳转后回退正确
- **WHEN** A→B→C 后跳转到 A，再执行 BACK
- **THEN** 访问栈按 A 为栈顶解释，BACK 回到 A 之前的节点（或提示无历史）
