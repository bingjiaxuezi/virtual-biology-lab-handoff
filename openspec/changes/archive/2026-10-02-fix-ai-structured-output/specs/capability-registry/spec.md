# Delta for capability-registry

## MODIFIED Requirements

### Requirement: Node Capability 元数据完整
每个 Node Capability MUST 含 type、version、description、configSchema、aiAuthoringHint，并 SHALL 预留 runtimeHandler 与 renderer 关联位。aiAuthoringHint MUST 声明该节点 config 的必填字段及其约束（如引用完整性、取值枚举），使 AI 在首轮生成时即知晓结构要求，而不只依赖 Repair 回喂。

#### Scenario: 读取 VARIABLE_INPUT 条目
- **WHEN** 读取 `VARIABLE_INPUT` 的 Capability
- **THEN** 返回含 version、description、configSchema（含 variableId/inputMode）与 aiAuthoringHint 的完整条目

#### Scenario: aiAuthoringHint 声明必填字段
- **WHEN** 读取 `QUESTION` 的 Capability
- **THEN** aiAuthoringHint 明确说明 config 必填 `prompt`
