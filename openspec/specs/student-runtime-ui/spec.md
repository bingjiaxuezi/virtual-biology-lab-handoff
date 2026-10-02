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
学生端 MUST 为 START、ACTION、VARIABLE_INPUT、MEDIA、OBSERVATION、QUESTION、CONDITION、END 八种节点类型提供渲染器；每种渲染器 MUST 消费节点的 config 与关联资源/变量定义。

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
运行页 MUST 展示当前 Run 的事件流（类型、时间、关联节点），按 sequence 升序，命令返回或轮询后刷新。

#### Scenario: 操作后轨迹即时更新
- **WHEN** 学生提交一次观察结果
- **THEN** 轨迹面板出现 OBSERVATION_SUBMITTED 事件，且 sequence 与前序事件连续

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
