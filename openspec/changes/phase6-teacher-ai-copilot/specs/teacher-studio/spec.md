# Spec Delta

## MODIFIED Requirements

### Requirement: AI Copilot 占位

教师端 MUST 在编辑器中提供真实可用的 AI Copilot 面板（取代占位入口）：输入教学意图生成草案，或输入修改指令生成 Change Proposal；面板 MUST 展示服务端生成的变更摘要与校验问题；教师确认后提案 MUST 仅写入编辑器草稿态（标记未保存），教师也可直接试玩提案内容；MUST NOT 提供「生成即发布」类入口，MUST NOT 再呈现「即将上线」占位。

#### Scenario: 生成并确认应用
- **WHEN** 教师在 Copilot 面板输入意图、生成草案并点击「应用到草稿」
- **THEN** 编辑器画布与面板刷新为提案内容，顶栏出现未保存标记，数据库在教师点保存前无写入

#### Scenario: 丢弃提案
- **WHEN** 教师生成提案后点击「丢弃」
- **THEN** 编辑器草稿恢复为提案前内容，无任何持久化变更

#### Scenario: 提案先试玩
- **WHEN** 教师在提案审阅时点击试玩
- **THEN** 浏览器内以提案 Definition 启动本地试玩会话，不依赖先保存
