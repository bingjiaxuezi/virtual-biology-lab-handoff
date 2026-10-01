# Spec Delta

## ADDED Requirements

### Requirement: 已发布实验目录对学生可见
系统 MUST 提供学生可访问的已发布实验目录查询：只返回存在至少一个已发布 Version 的实验及其最新版本信息，MUST NOT 暴露草稿内容。

#### Scenario: 学生浏览目录
- **WHEN** 学生请求实验目录
- **THEN** 只返回已发布实验的标题与最新版本号，不含 draft 字段

#### Scenario: 未发布实验不出现
- **WHEN** 某实验只有草稿从未发布
- **THEN** 目录中不包含该实验
