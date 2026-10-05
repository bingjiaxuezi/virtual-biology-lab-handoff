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

### Requirement: 轨迹点击跳转（读档）
流程图中已访问节点 MUST 可点击，点击后向 Runtime 发出 `JUMP_TO` 命令回到该节点；未访问（迷雾）节点与已完成 Run MUST 不可跳转；跳转成功后界面渲染目标节点，流程图追加 JUMPED_TO 对应的探索状态。

#### Scenario: 点击历史节点回到现场
- **WHEN** 学生点击流程图中早前去迷雾的"选择物镜"节点
- **THEN** 界面回到该节点，可重新作答；变量与分数保持不变

#### Scenario: 迷雾节点不可点击
- **WHEN** 学生点击未访问的迷雾节点
- **THEN** 不产生任何命令与状态变化

#### Scenario: 已完成实验轨迹只读
- **WHEN** Run 已完成，学生查看流程图
- **THEN** 所有节点去迷雾但不可点击，仅作回顾

### Requirement: 移动端轨迹与进度适配
视口 ≤800px 时：流程图地图带 MUST 保持在主内容上方且可平移缩放，不与操作栏重叠；背包 MUST 以底部抽屉呈现（默认收起为横条，点按展开半屏面板，再点收起）；页面 MUST NOT 出现横向整体溢出。

#### Scenario: 手机端查看轨迹
- **WHEN** 学生在手机视口打开运行页
- **THEN** 地图带在顶部以可读缩放呈现当前区域，可拖动查看全图，主内容与操作栏不被遮挡

#### Scenario: 手机端使用背包
- **WHEN** 学生点按底部「背包 (N)」横条
- **THEN** 背包面板展开为半屏，可浏览记录，再点收起

### Requirement: 实验记录背包
运行页 MUST 提供「背包」面板，聚合本次 Run 中学生已产生的记录：观察记录（OBSERVATION_SUBMITTED 全文与所属节点）、问答记录（题目、所选答案、是否正确）、关键变量变化（VARIABLE_CHANGED 的变量名与新值）；背包内容 MUST 从事件流与 Definition 在前端派生，MUST NOT 新增后端写接口；桌面端背包位于侧栏，移动端 MUST 以底部抽屉呈现。

#### Scenario: 背包聚合历史记录
- **WHEN** 学生已提交 2 条观察、回答 1 道题、触发 1 次变量变化后打开背包
- **THEN** 面板按类别展示这 4 条记录，内容与提交时一致

#### Scenario: 空背包提示
- **WHEN** 学生刚开始实验就打开背包
- **THEN** 显示规范空态提示，不报错

### Requirement: 战争迷雾流程图
运行页 MUST 以图状结构渲染完整实验流程（与教师端编辑器结构一致的全节点与分支连线）。未访问节点 MUST 迷雾化：仅显示占位框与节点类型图标，标题、选项、结果与媒体内容 MUST NOT 出现在页面 DOM 中；已访问节点 MUST 显示真实标题；当前节点 MUST 高亮；两端均已访问的连线 MUST 点亮以呈现走过路径。界面 MUST 展示已探索计数（已进入节点数/节点总数）。

#### Scenario: 迷雾不泄露内容
- **WHEN** 学生处于实验中段，检查未访问分支的节点
- **THEN** 仅看到占位框与类型图标，页面源码与辅助属性中均不含该节点真实标题

#### Scenario: 探索后区域解锁
- **WHEN** 学生从判断节点沿某分支进入新节点
- **THEN** 该节点去迷雾显示真实标题并高亮为当前节点， incoming 连线点亮，已探索计数 +1

#### Scenario: 支线与死胡同可见但未知
- **WHEN** 实验 Definition 含未走过的支线分支
- **THEN** 分支连线与迷雾节点轮廓可见，学生能感知"那里还有内容"但无法读到内容

### Requirement: 地图带布局与当前节点定位
流程图 MUST 以横向（LR）布局渲染于运行页主内容上方的地图带内：桌面端固定高度约 220px，移动端约 140px；MUST 支持平移与缩放；进入新节点后 MUST 自动把当前节点移入可视区域，MUST NOT 每次强缩全图。

#### Scenario: 推进后当前节点自动入视
- **WHEN** 学生提交操作进入下一节点，该节点此前在可视区域外
- **THEN** 地图带平滑滚动/平移使当前节点可见，缩放级别保持可读

#### Scenario: 长流程不缩成全图
- **WHEN** 实验有 70+ 节点
- **THEN** 地图带保持可读的默认缩放，通过平移浏览而非一次性缩至全图
