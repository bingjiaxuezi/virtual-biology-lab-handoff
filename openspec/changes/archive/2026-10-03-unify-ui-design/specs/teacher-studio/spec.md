# Spec Delta

## ADDED Requirements

### Requirement: 界面遵循设计系统
教师端所有页面（登录、实验列表、编辑器、学生轨迹）MUST 遵循 ui-design-system 的设计令牌与组件规范；表格、表单、操作按钮、空态与加载态 MUST 使用规范定义的统一样式。

#### Scenario: 列表页空态规范
- **WHEN** 教师账号下没有任何实验
- **THEN** 实验列表页展示规范的空态提示与新建入口，而非空白表格

#### Scenario: 编辑器操作区视觉一致
- **WHEN** 教师打开编辑器
- **THEN** 工具栏、属性面板、校验面板的按钮与面板样式与列表页保持同一规范
