# student-runtime-ui Specification

## Purpose

为学生提供 Definition 驱动的实验运行界面：不按实验写页面，由统一渲染器把当前节点、变量与媒体渲染成交互界面，并实时展示事件轨迹。

## Requirements

### Requirement: Definition 驱动渲染
学生端 MUST 按当前 Run 的 currentNodeId 从 Definition 找到节点定义并渲染对应节点组件；界面 MUST NOT 包含任何特定实验的硬编码内容。

#### Scenario: 同一界面运行不同实验
- **WHEN** 先后运行酶温度实验与光照实验两个不同 Definition
- **THEN** 同一套界面代码正确渲染两者的节点流程，无需任何代码修改

### Requirement: 八种节点类型可渲染可交互
学生端 MUST 为 START、ACTION、VARIABLE_INPUT、MEDIA、OBSERVATION、QUESTION、CONDITION、END 八种节点类型提供渲染器；每种渲染器 MUST 消费节点的 config 与关联资源/变量定义，并 MUST 使用统一操作栏呈现操作。

#### Scenario: 未知节点类型的兜底
- **WHEN** Definition 中出现渲染器未覆盖的节点类型
- **THEN** 显示明确的「暂不支持」占位而非崩溃

### Requirement: 变量输入控件与变量类型匹配
VARIABLE_INPUT 节点 MUST 按变量类型渲染控件：NUMBER 渲染滑块或步进器（含 min/max/unit）、ENUM 渲染选项组、BOOLEAN 渲染开关；提交时 MUST 发送 SET_VARIABLE 命令。

#### Scenario: 数字变量越界被拒绝
- **WHEN** 学生试图提交超出 min/max 的数值
- **THEN** 服务端拒绝并在界面上显示原因，界面状态不变

### Requirement: 交互命令经 API 原子提交
学生的一切操作 MUST 通过 API dispatch 提交；命令被拒绝时界面 MUST 展示拒绝原因且不改变展示状态；命令成功后界面 MUST 刷新为服务端返回的最新状态。

#### Scenario: 非当前节点的命令不可发出
- **WHEN** 当前节点是 OBSERVATION
- **THEN** 界面不提供回答问题的输入入口

### Requirement: 运行会话生命周期
学生端 MUST 支持：浏览已发布实验目录、创建 Run、开始运行、推进到完成、查看完成结果（outcome/得分/关键事件）。

#### Scenario: 完整跑完一次实验
- **WHEN** 学生从目录进入实验并完成全部节点
- **THEN** 看到完成页，包含 outcome 与得分，事件轨迹完整可查

### Requirement: 事件轨迹实时可见
运行页 MUST 展示当前 Run 的事件流，按 sequence 升序，命令返回或轮询后刷新。每条事件 MUST 以人类可读形式呈现：关联节点标题（MUST NOT 直接暴露内部 nodeId）、操作摘要（选择项 / 变量变化 / 得分变化）、时间；当前节点对应的事件 MUST 高亮标记。

#### Scenario: 操作后轨迹即时更新
- **WHEN** 学生提交一次观察结果
- **THEN** 轨迹面板出现该事件，显示节点标题与"提交了观察记录"等摘要，sequence 与前序事件连续

#### Scenario: 轨迹不暴露内部 ID
- **WHEN** 学生查看事件轨迹
- **THEN** 显示节点标题（如"观察：吞噬现象"）而非 `obs_phagocytosis` 之类的内部 ID

### Requirement: AI 区域只读占位
界面 SHALL 为 AI Briefing/Tutor/Review 预留区域，本阶段仅展示「即将上线」占位；MUST NOT 提供任何可改变 Run 状态的 AI 操作入口。

#### Scenario: AI 占位不干扰运行
- **WHEN** 学生查看 AI 区域
- **THEN** 只看到占位说明，不存在任何可触发状态变更的控件

### Requirement: 学生端 AI 入口
学生端 MUST 按 aiPolicy 开关渲染 AI 入口：briefing 开启时 START 节点提供「实验导读」；tutor 开启时各节点提供「求助 AI」；observationAssist 开启时 OBSERVATION 节点提供「AI 完善建议」；review 开启且 Run 完成后提供「生成复盘」；开关关闭时对应入口 MUST NOT 出现。

#### Scenario: 入口随策略显隐
- **WHEN** 某实验 tutor.enabled=false
- **THEN** 运行界面不出现「求助 AI」按钮

#### Scenario: 复盘入口仅完成后出现
- **WHEN** Run 尚未完成
- **THEN** 不出现「生成复盘」入口

### Requirement: 观察建议采纳不自动提交
学生在 OBSERVATION 节点采纳 AI 建议时，界面 MUST 只把建议文本填入观察输入框，MUST NOT 自动提交；提交 MUST 仍由学生显式触发。

#### Scenario: 采纳后仍可编辑
- **WHEN** 学生点击采纳 AI 的观察建议
- **THEN** 建议文本进入输入框且可继续编辑，无 SUBMIT_OBSERVATION 命令发出

### Requirement: 统一操作栏
每种节点视图 MUST 在面板底部渲染统一操作栏：回退按钮固定最左（无历史时禁用），主按钮固定最右；交互节点的两步操作 MUST 在同一按钮原位切换（节点动词 → 「继续」），位置与尺寸不变；操作栏上方 MUST 显示「第 N 步」进度提示（N 为已进入节点数）。

#### Scenario: 按钮位置跨节点一致
- **WHEN** 学生依次经过 MEDIA、VARIABLE_INPUT、OBSERVATION 节点
- **THEN** 主按钮始终位于面板底部最右，回退按钮始终位于最左

#### Scenario: 两步操作原位切换
- **WHEN** 学生在 QUESTION 节点提交回答成功
- **THEN** 原「提交回答」按钮原位变为「继续」

### Requirement: 回退入口
操作栏 MUST 提供回退按钮，点击向 Runtime 发出 `BACK` 命令；回退成功后界面渲染目标节点；无历史或 Run 已结束时按钮禁用或展示拒绝原因。

#### Scenario: 回退重看视频
- **WHEN** 学生看完结果视频进入下一节点后点击回退
- **THEN** 回到该 MEDIA 节点并可重新播放

### Requirement: 媒体展示规格
MEDIA 节点的视频/图片 MUST 占满面板宽度，视频按 16:9 比例展示且最大高度不小于 60vh；图片 MUST 支持点击查看原图；素材缺失时仍降级为占位卡。

#### Scenario: 视频足够大
- **WHEN** 学生进入含 VIDEO 的 MEDIA 节点
- **THEN** 视频以面板全宽、16:9 比例渲染，可直接播放

### Requirement: 界面遵循设计系统
学生端所有页面（实验目录、运行页、复盘页）MUST 遵循 ui-design-system 的设计令牌与组件规范，CSS 变量名与教师端一致；目录卡片、操作按钮、面板与提示样式 MUST 使用规范定义的统一样式。

#### Scenario: 目录页视觉规范
- **WHEN** 学生打开实验目录
- **THEN** 实验以规范卡片呈现（标题、更新时间、开始入口），空目录时展示规范空态

#### Scenario: token 命名一致
- **WHEN** 检查学生端样式表
- **THEN** 颜色、间距等变量名与教师端令牌命名完全一致，不存在另一套命名

### Requirement: 非安全上下文兼容

前端在 HTTP + IP 等非安全上下文（`crypto.randomUUID` 不可用）下 MUST 仍能完成会话初始化与实验运行所需的 ID 生成，不得因 UUID 生成失败导致页面白屏或运行时中断。

#### Scenario: HTTP 下学生端启动

- **WHEN** 学生通过 `http://<ip>:<port>/` 访问学生端
- **THEN** 学生 ID 正常生成，页面正常渲染，不抛出 `crypto.randomUUID is not a function`

#### Scenario: HTTP 下运行与事件记录

- **WHEN** 学生在非安全上下文启动实验运行并产生事件
- **THEN** runId 与 eventId 正常生成，运行流程不中断

#### Scenario: 安全上下文行为不变

- **WHEN** 页面运行于 HTTPS 或 localhost
- **THEN** ID 生成仍优先使用 `crypto.randomUUID`，行为与修复前一致

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
