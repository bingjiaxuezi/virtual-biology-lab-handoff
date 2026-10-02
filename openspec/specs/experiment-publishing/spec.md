# experiment-publishing Specification

## Purpose

为教师提供实验内容的持久化生命周期管理：草稿可随时修改，发布前强制通过三层校验，发布后成为不可变版本，作为学生运行的固定依据。

## Requirements

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

### Requirement: 发布前强制校验
发布 MUST 先通过 Phase 1 三层 Validator 全部校验（无 error 级问题）；校验失败 MUST 返回完整问题列表（code/path/message/severity），且 MUST NOT 产生版本。

#### Scenario: 校验失败禁止发布
- **WHEN** 发布一份含未定义变量引用的草稿
- **THEN** 发布失败并返回 VARIABLE_REF_UNDEFINED 等问题列表，版本数不变

### Requirement: 版本不可变
发布 MUST 生成新的 ExperimentVersion（递增版本号 + 完整 Definition 快照）；已发布 Version MUST NOT 被原地修改或删除；对已发布实验的修改 MUST 通过新草稿再次发布产生新 Version。

#### Scenario: 发布后修改产生新版本
- **WHEN** 教师修改已发布实验并再次发布
- **THEN** 生成版本号递增的新 Version，旧 Version 内容逐字节不变

### Requirement: 资源只登记逻辑引用
Asset 登记 MUST 只保存 assetId、类型与元数据，MUST NOT 存储或返回供应商 URL。

#### Scenario: 登记资源
- **WHEN** 教师为实验登记一个 VIDEO 资源
- **THEN** 系统中出现该 assetId 的记录，且无任何 URL 字段

### Requirement: 已发布实验目录对学生可见
系统 MUST 提供学生可访问的已发布实验目录查询：只返回存在至少一个已发布 Version 的实验及其最新版本信息，MUST NOT 暴露草稿内容。

#### Scenario: 学生浏览目录
- **WHEN** 学生请求实验目录
- **THEN** 只返回已发布实验的标题与最新版本号，不含 draft 字段

#### Scenario: 未发布实验不出现
- **WHEN** 某实验只有草稿从未发布
- **THEN** 目录中不包含该实验

### Requirement: 学生可读取已发布版本定义
系统 MUST 提供按版本 id 读取已发布 ExperimentVersion 完整 Definition 快照的端点；已发布内容对学生只读，MUST NOT 提供修改入口。

#### Scenario: 读取已发布版本
- **WHEN** 学生请求某个已发布版本的 Definition
- **THEN** 返回该版本发布时的完整 Definition 快照

### Requirement: 教师查询学生运行列表
系统 MUST 提供按实验查询学生 Run 列表的教师端点：返回该实验全部已发布版本下的 Run 摘要（runId/学生标识/状态/得分/开始时间），MUST 要求教师认证，MUST NOT 暴露草稿内容。

#### Scenario: 按实验列出 Run
- **WHEN** 教师携带有效 JWT 查询某实验的 Run 列表
- **THEN** 返回该实验所有版本下的 Run 摘要，按开始时间倒序

#### Scenario: 未认证不可见
- **WHEN** 未携带 JWT 请求该端点
- **THEN** 返回 401
