# experiment-publishing Specification

## Purpose

为教师提供实验内容的持久化生命周期管理：草稿可随时修改，发布前强制通过三层校验，发布后成为不可变版本，作为学生运行的固定依据。

## Requirements

### Requirement: 实验草稿管理
系统 MUST 支持创建、读取、更新、删除实验草稿；草稿 MUST 以 Experiment Definition 结构存储，保存时 SHALL 做结构校验，语义/能力问题以 warning 形式返回但不阻断保存。

#### Scenario: 创建草稿
- **WHEN** 教师提交一份结构合法的 Definition 创建草稿
- **THEN** 草稿持久化并返回草稿 id

#### Scenario: 结构非法拒绝保存
- **WHEN** 提交缺少必填字段的 Definition
- **THEN** 保存被拒绝并返回稳定错误码与路径

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
