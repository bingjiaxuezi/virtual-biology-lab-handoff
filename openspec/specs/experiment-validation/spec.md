# experiment-validation Specification

## Purpose

提供 Experiment Definition 的三层校验能力（结构、语义、能力），在 AI 生成、教师保存与发布前拦截非法 Definition，并输出稳定、可机器消费的错误信息。

## Requirements

### Requirement: 结构校验
Validator MUST 先执行结构校验（Schema parse），任何结构非法 MUST 直接失败且不进入后续语义校验。

#### Scenario: 结构非法短路
- **WHEN** 校验一份缺少 `nodes` 字段的 Definition
- **THEN** 返回结构错误，且不产生语义校验结果

### Requirement: 流程图完整性
语义校验 MUST 检查：START 恰好一个、至少一个 END、每个 END 可达、node id 唯一、transition id 唯一、transition 的 from/to 必须指向已存在节点；不可达节点 MUST 按约定策略报告（v0.1 记为 warning）。

#### Scenario: 缺 START 失败
- **WHEN** 校验无 START 节点的 Definition
- **THEN** 返回错误，错误码标识 START 缺失

#### Scenario: 多 START 失败
- **WHEN** 校验含两个 START 节点的 Definition
- **THEN** 返回错误，错误码标识 START 重复

#### Scenario: Transition 指向不存在节点失败
- **WHEN** 校验某 transition 的 `to` 引用不存在节点
- **THEN** 返回错误并指出该 transition 路径

#### Scenario: END 不可达失败
- **WHEN** 校验存在从 START 无法到达的 END
- **THEN** 返回错误，错误码标识 END 不可达

#### Scenario: 不可达普通节点告警
- **WHEN** 校验存在不可达的非 END 节点
- **THEN** 返回 warning 而非 error

### Requirement: 引用完整性
语义校验 MUST 检查：variable id 唯一、Definition 内所有 variable 引用指向已定义变量、所有 asset 引用指向已声明 asset。

#### Scenario: 未定义变量引用失败
- **WHEN** 校验 Condition 引用未声明的 `temperature2`
- **THEN** 返回错误并指出引用路径

#### Scenario: 未声明 asset 引用失败
- **WHEN** 校验 MEDIA 节点引用未声明的 assetId
- **THEN** 返回错误并指出节点路径

### Requirement: 类型兼容性
语义校验 MUST 检查：Condition 操作符与变量类型兼容（如 NUMBER 允许 GT，BOOLEAN 不允许 GT），Rule Effect 与变量类型兼容（如 ADD/SUBTRACT 仅允许 NUMBER，SET 值类型须匹配）。

#### Scenario: NUMBER + GT 合法
- **WHEN** 校验 NUMBER 变量上的 GT 条件
- **THEN** 该项校验通过

#### Scenario: BOOLEAN + GT 非法
- **WHEN** 校验 BOOLEAN 变量上的 GT 条件
- **THEN** 返回类型不兼容错误

#### Scenario: SET 类型不匹配失败
- **WHEN** 校验对 NUMBER 变量 SET 字符串值的 Rule
- **THEN** 返回类型不兼容错误

### Requirement: 能力校验
Validator MUST 检查 Definition 用到的所有 Node Type、Variable Type、Operator、Effect、Media Type 均存在于当前 Capability Registry。

#### Scenario: 未注册 Node Type 失败
- **WHEN** 校验含 Registry 未注册节点类型的 Definition
- **THEN** 返回错误，错误码标识能力不支持

### Requirement: 错误输出稳定
Validator 输出 MUST 含稳定的 error code、path、message，并区分 error 与 warning 级别，供 AI Repair 与编辑器直接消费。

#### Scenario: 错误结构可机器消费
- **WHEN** 校验任意非法 Definition
- **THEN** 每个问题项都含 code/path/message/severity 四要素

### Requirement: 样板实验通过校验
`examples/enzyme-temperature.v0.1.json` MUST 通过全部三层校验，且包含 temperature NUMBER、sampleStatus ENUM、>60℃ 分支、NORMAL/DENATURED 两种结果、至少一个 MEDIA、至少一个 OBSERVATION 与 AI Policy。

#### Scenario: 样板实验合法
- **WHEN** 对样板实验执行完整校验
- **THEN** 校验通过且无 error
