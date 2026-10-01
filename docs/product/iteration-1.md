# Iteration 1 范围

## 目标

验证以下四件事：

1. AI 能生成符合结构约束的 Experiment Definition。
2. Teacher Studio 能可视化并修改 Definition。
3. 一个统一 Runtime 能运行多个 Definition，而不是按实验写页面。
4. Event Log 能完整记录学生实验过程，并为 AI Tutor/复盘提供上下文。

## 教师侧范围

### 我的实验

- 实验列表
- 新建实验
- 编辑草稿
- 发布实验

### 创建方式

- AI 创建
- 空白创建
- 模板创建可作为 Iteration 1.1；若工期紧可暂缓

### AI Copilot

支持：

- 生成实验基本信息
- 生成变量
- 生成步骤
- 生成基础规则
- 生成观察问题
- 生成评分建议
- 对话式提出修改建议
- 校验失败后的 AI Repair

所有修改必须形成 Change Proposal，由教师确认后应用。

### 编辑器节点

Iteration 1 固定：

- `START`
- `ACTION`
- `VARIABLE_INPUT`
- `MEDIA`
- `OBSERVATION`
- `QUESTION`
- `CONDITION`
- `END`

### 变量

- `NUMBER`
- `ENUM`
- `BOOLEAN`

### 规则

比较：`= != > < >= <=`

Effect：`SET ADD SUBTRACT SCORE`

流程跳转由 Transition 表达，不在 Rule 内提供 GOTO。

### 资源

- 视频
- 图片
- 文本

### 预览/发布

- 教师试玩
- 校验
- 发布

## 学生侧范围

- 实验列表/详情
- 实验前 AI Briefing
- Runtime 动态渲染
- 设置变量
- 选择操作
- 播放视频/展示图片
- 填写观察结果
- 条件跳转
- 完成实验
- AI Tutor
- AI 观察助手
- AI 实验后 Review

## AI Tutor 原则

学生 AI 可以读取：

- Experiment Definition
- Current Node
- Current State
- Experiment Events
- Student Observation
- AI Policy

Student AI 不允许：

- 直接执行 Runtime Command
- 替学生设置变量
- 替学生选择正确答案
- 替学生提交观察结果
- 修改实验 Definition

## 样板实验

“温度对酶活性的影响”至少包含：

- `temperature` 数字变量
- `sampleStatus` 枚举变量
- 一个 `temperature > 60` 条件
- 两个不同结果
- 一个视频资源
- 一个观察问题
- 一次 AI Tutor 提示
- 完整 Event Log

## 明确不做

- VR/AR
- 3D 实验室
- Blockly
- 科研级数值仿真
- LMS 深度集成
- 多学校复杂多租户
- 支付
- 实验社区/Marketplace
- AI 生成实验视频
- AI 自动最终评分
- 复杂 BI 看板
