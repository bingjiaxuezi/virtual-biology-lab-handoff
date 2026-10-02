# teacher-auth Specification

## Purpose
为教师侧功能提供最小可用认证：教师注册/登录获得 JWT，API 默认要求认证，仅学生端公开端点放行。

## Requirements

### Requirement: 教师注册与登录
系统 MUST 提供教师注册端点（用户名 + 密码）与登录端点；密码 MUST 以 bcrypt 哈希存储，MUST NOT 明文保存或在任何响应中返回；登录成功 MUST 返回带过期时间的 JWT。

#### Scenario: 注册成功
- **WHEN** 教师提交未被占用的用户名与合规密码注册
- **THEN** 创建教师账号并返回 JWT

#### Scenario: 用户名冲突
- **WHEN** 使用已存在的用户名注册
- **THEN** 拒绝并返回稳定错误码，不创建账号

#### Scenario: 登录密码错误
- **WHEN** 教师提交正确用户名与错误密码登录
- **THEN** 拒绝并返回通用认证失败错误，不泄露用户名是否存在

### Requirement: 教师侧接口鉴权
API MUST 默认要求有效 JWT；学生端公开端点（实验目录、已发布版本读取、Run 创建/读取/dispatch）MUST 显式标注为公开；认证失败 MUST 返回 401 且 MUST NOT 执行业务操作。

#### Scenario: 无令牌访问受保护端点
- **WHEN** 未携带 Authorization 头请求创建草稿端点
- **THEN** 返回 401，不产生任何数据变更

#### Scenario: 学生端点保持公开
- **WHEN** 学生不携带令牌请求实验目录或创建 Run
- **THEN** 正常返回，不要求认证

#### Scenario: 过期或伪造令牌
- **WHEN** 携带过期或签名非法的 JWT 请求受保护端点
- **THEN** 返回 401

### Requirement: 密钥配置外部化
JWT 签名密钥 MUST 从环境变量读取，MUST NOT 硬编码在源码中；本地开发默认值 MUST 明确标注不可用于生产。

#### Scenario: 未配置密钥时的行为
- **WHEN** 生产环境未提供 JWT 密钥环境变量
- **THEN** 服务启动失败并给出明确错误，而非静默使用弱默认值
