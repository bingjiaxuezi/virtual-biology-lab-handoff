# ops-bootstrap Specification

## Purpose
TBD - created by archiving change ops-db-bootstrap. Update Purpose after archive.

## Requirements

### Requirement: 一键数据库引导
系统 MUST 提供单条命令（`db:setup`）完成新环境数据库就绪：目标库不存在时自动创建、执行全部版本化迁移、执行幂等种子。该命令 MUST 可反复执行且对已就绪环境零副作用；任一步骤失败 MUST 以非零码退出。

#### Scenario: 全新环境首次执行
- **WHEN** 对不存在的数据库执行 `db:setup`
- **THEN** 自动创建数据库、应用全部迁移、写入初始教师账号与样板实验（含其 Asset 注册）

#### Scenario: 重复执行幂等
- **WHEN** 对已就绪的数据库再次执行 `db:setup`
- **THEN** 不重复创建账号/实验/资源，不修改已有数据，退出码为 0

### Requirement: 初始账号可配置
初始教师账号的用户名与密码 MUST 可通过环境变量（`SEED_TEACHER_USERNAME` / `SEED_TEACHER_PASSWORD`）覆盖；密码 MUST 只以 bcrypt 哈希落库。

#### Scenario: 默认账号创建
- **WHEN** 在未配置环境变量的全新环境执行种子
- **THEN** 创建默认教师账号 `teacher_dev`，数据库中仅存密码哈希
