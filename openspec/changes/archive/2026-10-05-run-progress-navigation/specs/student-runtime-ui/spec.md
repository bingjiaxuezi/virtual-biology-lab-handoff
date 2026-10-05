# student-runtime-ui Specification Delta

## MODIFIED Requirements

### Requirement: 事件轨迹实时可见
运行页 MUST 展示当前 Run 的事件流，按 sequence 升序，命令返回或轮询后刷新。每条事件 MUST 以人类可读形式呈现：关联节点标题（MUST NOT 直接暴露内部 nodeId）、操作摘要（选择项 / 变量变化 / 得分变化）、时间；当前节点对应的事件 MUST 高亮标记。

#### Scenario: 操作后轨迹即时更新
- **WHEN** 学生提交一次观察结果
- **THEN** 轨迹面板出现该事件，显示节点标题与"提交了观察记录"等摘要，sequence 与前序事件连续

#### Scenario: 轨迹不暴露内部 ID
- **WHEN** 学生查看事件轨迹
- **THEN** 显示节点标题（如"观察：吞噬现象"）而非 `obs_phagocytosis` 之类的内部 ID

## ADDED Requirements

### Requirement: 里程碑进度条
运行页顶部 MUST 渲染里程碑进度条：以 Definition 中 start→end 的最长主路径节点为刻度；当前节点高亮、已进入节点点亮、未到达节点置灰；刻度超出可视宽度时 MUST 支持横向滚动。进度条为纯展示组件，MUST NOT 发出任何命令。

#### Scenario: 进度随分支推进
- **WHEN** 学生经过条件分支进入第三层节点
- **THEN** 进度条已走过的里程碑点亮，当前节点高亮，未到达部分保持灰色

### Requirement: 轨迹点击跳转（读档）
事件轨迹中历史 `NODE_ENTERED` 条目 MUST 可点击，点击后向 Runtime 发出 `JUMP_TO` 命令回到该节点；非 NODE_ENTERED 条目与已完成 Run MUST 不可跳转；跳转成功后界面渲染目标节点，轨迹追加 JUMPED_TO 事件。

#### Scenario: 点击历史节点回到现场
- **WHEN** 学生点击轨迹中早前的"进入节点：选择物镜"条目
- **THEN** 界面回到该节点，可重新作答；变量与分数保持不变

#### Scenario: 已完成实验轨迹只读
- **WHEN** Run 已完成，学生查看轨迹
- **THEN** 所有条目不可点击，仅作回顾

### Requirement: 移动端轨迹与进度适配
视口 ≤800px 时：事件轨迹 MUST 从侧栏改为底部抽屉（默认收起为"轨迹 (N)"横条，点按展开半屏列表，再点或下滑收起）；里程碑进度条 MUST 横向可滚动且不与操作栏重叠。

#### Scenario: 手机端查看轨迹
- **WHEN** 学生在手机视口打开运行页
- **THEN** 主内容占满宽度，轨迹以底部横条呈现，点按展开后可点击跳转

### Requirement: 实验记录背包
运行页 MUST 提供「背包」面板，聚合本次 Run 中学生已产生的记录：观察记录（OBSERVATION_SUBMITTED 全文与所属节点）、问答记录（题目、所选答案、是否正确）、关键变量变化（VARIABLE_CHANGED 的变量名与新值）；背包内容 MUST 从事件流与 Definition 在前端派生，MUST NOT 新增后端写接口；面板与事件轨迹以分页签共存，移动端 MUST 与轨迹共用底部抽屉的页签。

#### Scenario: 背包聚合历史记录
- **WHEN** 学生已提交 2 条观察、回答 1 道题、触发 1 次变量变化后打开背包
- **THEN** 面板按类别展示这 4 条记录，内容与提交时一致

#### Scenario: 空背包提示
- **WHEN** 学生刚开始实验就打开背包
- **THEN** 显示规范空态提示，不报错
