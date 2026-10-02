# Spec Delta

## ADDED Requirements

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
