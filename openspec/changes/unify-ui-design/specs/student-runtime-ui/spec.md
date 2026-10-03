# Spec Delta

## ADDED Requirements

### Requirement: 界面遵循设计系统
学生端所有页面（实验目录、运行页、复盘页）MUST 遵循 ui-design-system 的设计令牌与组件规范，CSS 变量名与教师端一致；目录卡片、操作按钮、面板与提示样式 MUST 使用规范定义的统一样式。

#### Scenario: 目录页视觉规范
- **WHEN** 学生打开实验目录
- **THEN** 实验以规范卡片呈现（标题、更新时间、开始入口），空目录时展示规范空态

#### Scenario: token 命名一致
- **WHEN** 检查学生端样式表
- **THEN** 颜色、间距等变量名与教师端令牌命名完全一致，不存在另一套命名
