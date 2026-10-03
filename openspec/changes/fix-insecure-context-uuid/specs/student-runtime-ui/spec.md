# Spec Delta

## ADDED Requirements

### Requirement: 非安全上下文兼容

前端在 HTTP + IP 等非安全上下文（`crypto.randomUUID` 不可用）下 MUST 仍能完成会话初始化与实验运行所需的 ID 生成，不得因 UUID 生成失败导致页面白屏或运行时中断。

#### Scenario: HTTP 下学生端启动

- **WHEN** 学生通过 `http://<ip>:<port>/` 访问学生端
- **THEN** 学生 ID 正常生成，页面正常渲染，不抛出 `crypto.randomUUID is not a function`

#### Scenario: HTTP 下运行与事件记录

- **WHEN** 学生在非安全上下文启动实验运行并产生事件
- **THEN** runId 与 eventId 正常生成，运行流程不中断

#### Scenario: 安全上下文行为不变

- **WHEN** 页面运行于 HTTPS 或 localhost
- **THEN** ID 生成仍优先使用 `crypto.randomUUID`，行为与修复前一致
