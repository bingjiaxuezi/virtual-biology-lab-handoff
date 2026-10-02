# teacher-ai-copilot Specification

## Purpose
让教师用自然语言生成/修改实验草案：AI 输出必须受 Capability Registry 约束、通过三层 Validator，产物只是 Change Proposal，由教师确认后才进入草稿。供应商通过接口隔离，密钥只在服务端。

## Requirements

### Requirement: AI Provider 接口隔离
系统 MUST 通过 AIProvider 接口隔离具体供应商；供应商凭证 MUST 只存在于服务端环境变量，MUST NOT 出现在前端代码或任何 API 响应中；未配置真实供应商时 MUST 可回退到 Mock Provider 保证离线可用。

#### Scenario: 默认离线可用
- **WHEN** 未配置 AI_BASE_URL/AI_API_KEY，AI_PROVIDER 为默认 mock
- **THEN** 生成与修改端点正常工作，不产生任何外网请求

#### Scenario: 凭证不泄漏
- **WHEN** 教师调用任一 AI 端点
- **THEN** 响应中不包含 API Key、Base URL 等供应商配置

### Requirement: 自然语言生成实验草案
系统 MUST 提供教师端点：输入教学意图描述，输出完整 Experiment Definition 草案提案；生成约束 MUST 来自 Capability Registry（节点/变量/操作符/效果白名单与 authoring hint）；提案 MUST NOT 自动保存或发布。

#### Scenario: 生成成功
- **WHEN** 教师提交「生成一个关于光合作用速率的实验」
- **THEN** 返回通过三层校验的 Definition 草案，数据库无任何写入

#### Scenario: 生成不直接发布
- **WHEN** AI 生成了一份合法草案
- **THEN** 该实验的已发布版本数不变，草稿内容不变（除非教师另行确认应用）

### Requirement: 指令式修改形成 Change Proposal
系统 MUST 提供教师端点：输入当前草稿 + 修改指令，输出新 Definition 与服务端生成的变更摘要（节点/变量/规则增删改计数与关键变化）；MUST NOT 信任 AI 自述的变更说明。

#### Scenario: 修改摘要由服务端生成
- **WHEN** 教师提交「把温度上限改为 100 并增加一个提问节点」
- **THEN** 响应包含新 Definition 与摘要，摘要列出实际的变量修改与节点新增

### Requirement: 校验失败的有界 Repair
AI 输出 MUST 经过与手写内容相同的三层 Validator；存在 error 时系统 SHALL 把问题列表（code/path/message）回喂 Provider 要求修复，最多 2 轮；仍有 error 时 MUST 返回提案与剩余问题并标记 needsReview，由教师在编辑器中修复。

#### Scenario: 一轮修复成功
- **WHEN** AI 首次输出引用了未注册的操作符，修复后合法
- **THEN** 返回修复后的草案，issues 为空

#### Scenario: 修复不绕过校验
- **WHEN** 2 轮修复后仍有 error
- **THEN** 响应标记 needsReview 并附完整问题列表，教师可查看但应用时仍需通过保存校验

### Requirement: AI 端点要求教师认证
全部 AI 生成/修改端点 MUST 要求有效教师 JWT；学生端 MUST NOT 出现任何 AI 生成入口。

#### Scenario: 未认证调用被拒
- **WHEN** 未携带 JWT 调用 AI 生成端点
- **THEN** 返回 401，不产生任何 Provider 调用
