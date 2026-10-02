# Spec Delta

## MODIFIED Requirements

### Requirement: 实验草稿管理
系统 MUST 支持创建、读取、更新、删除实验草稿；草稿 MUST 以 Experiment Definition 结构存储，保存时 SHALL 做结构校验，语义/能力问题以 warning 形式返回但不阻断保存。全部草稿写操作与发布操作 MUST 要求教师认证（有效 JWT），未认证请求 MUST 返回 401 且不产生数据变更。

#### Scenario: 创建草稿
- **WHEN** 教师携带有效 JWT 提交一份结构合法的 Definition 创建草稿
- **THEN** 草稿持久化并返回草稿 id

#### Scenario: 结构非法拒绝保存
- **WHEN** 提交缺少必填字段的 Definition
- **THEN** 保存被拒绝并返回稳定错误码与路径

#### Scenario: 未认证写操作被拒绝
- **WHEN** 未携带 JWT 请求创建、更新、删除草稿或发布实验
- **THEN** 返回 401，系统中无任何数据变更

## ADDED Requirements

### Requirement: 教师查询学生运行列表
系统 MUST 提供按实验查询学生 Run 列表的教师端点：返回该实验全部已发布版本下的 Run 摘要（runId/学生标识/状态/得分/开始时间），MUST 要求教师认证，MUST NOT 暴露草稿内容。

#### Scenario: 按实验列出 Run
- **WHEN** 教师携带有效 JWT 查询某实验的 Run 列表
- **THEN** 返回该实验所有版本下的 Run 摘要，按开始时间倒序

#### Scenario: 未认证不可见
- **WHEN** 未携带 JWT 请求该端点
- **THEN** 返回 401
