# ci-cd Specification

## Purpose
定义平台的持续集成与持续部署契约：每次提交的自动化质量门禁与敏感信息硬校验、镜像构建与归档、一键全自动发布的执行链路、以及密钥管理要求，使迭代节奏可重复、可审计、可回滚。

## Requirements

### Requirement: CI 质量门禁
每次 push 与 Pull Request MUST 触发自动化检查，包含：锁定依赖安装、代码规范检查、类型检查、单元/集成测试、全量构建；任一步骤失败 MUST 使检查结果为失败。

#### Scenario: 全部检查通过
- **WHEN** 提交代码且 lint、typecheck、test、build 均成功
- **THEN** CI 检查结果为成功

#### Scenario: 测试失败阻断
- **WHEN** 任一测试用例失败
- **THEN** CI 检查结果为失败，并在结果中可见失败详情

#### Scenario: 锁文件与清单不一致
- **WHEN** `pnpm-lock.yaml` 与 `package.json` 依赖声明不一致
- **THEN** 依赖安装步骤失败，CI 结果为失败

### Requirement: 敏感信息硬校验
CI MUST 对每次提交执行敏感信息扫描（密钥、私钥、令牌等），MUST 同时对基础设施信息（服务器 IP 等约定的禁用模式）做模式检查；任一命中 MUST 使 CI 失败，阻止其进入主分支。仓库为公开仓库，此类信息 MUST NOT 出现在任何被推送的提交中。

#### Scenario: 密钥被拦截
- **WHEN** 提交中包含私钥、API Key 等敏感材料
- **THEN** CI 敏感信息扫描步骤失败，并在日志中指出文件位置（不打印密钥内容）

#### Scenario: 基础设施信息被拦截
- **WHEN** 提交中包含约定禁用的服务器 IP 等基础设施信息模式
- **THEN** CI 模式检查步骤失败

#### Scenario: 干净提交通过
- **WHEN** 提交不含任何敏感信息与禁用模式
- **THEN** 扫描步骤通过

### Requirement: CI Node 版本策略
CI 主流程 MUST 使用满足全部工具链要求的 Node 版本（当前为 22）；同时 MUST 在 `engines` 声明的最低 Node 版本（20）上运行 API 测试，保证生产运行时下限兼容。

#### Scenario: 主流程工具链兼容
- **WHEN** CI 主流程执行 OpenSpec 校验等依赖新版 Node 语法的步骤
- **THEN** 在主流程 Node 版本下正常执行

#### Scenario: 生产下限验证
- **WHEN** API 测试在 Node 20 job 中执行
- **THEN** 测试通过，证明 `engines: >=20` 成立

### Requirement: OpenSpec 规格校验
存在进行中的 OpenSpec change 时，CI MUST 执行规格格式校验；校验失败 MUST 使 CI 结果为失败。

#### Scenario: 规格格式错误
- **WHEN** 提交包含不符合 schema 的 change 产物
- **THEN** CI 失败并指出具体 change 与错误

### Requirement: 镜像构建验证
CI MUST 构建 API 生产镜像（不推送），验证 Dockerfile 可用；镜像构建失败 MUST 使 CI 结果为失败。

#### Scenario: Dockerfile 退化被拦截
- **WHEN** 修改导致 API 镜像构建失败
- **THEN** CI 失败，阻止问题进入主分支

### Requirement: CD 手动触发
发布流程 MUST 通过显式手动触发启动，MUST 支持指定目标代码引用（分支或 commit）；MUST NOT 因普通 push 自动触发生产发布。

#### Scenario: 手动触发
- **WHEN** 维护者在 GitHub 界面手动触发部署流程并选择目标引用
- **THEN** 发布流程开始执行

#### Scenario: 普通提交不触发发布
- **WHEN** 代码合入 develop 分支
- **THEN** 仅 CI 运行，生产环境不发生任何变更

### Requirement: CD 全自动发布
手动触发后，CD MUST 无需任何人工介入地完成：构建三个组件镜像并以可回溯标签（含 commit SHA）推送镜像仓库 → 服务器拉取镜像 → 执行发布脚本（迁移先行、健康检查、失败回滚，由 `deployment` 能力保证）→ 报告发布结果。CD MUST 通过并发互斥防止多个发布同时执行。

#### Scenario: 一键发布成功
- **WHEN** 维护者手动触发 CD 且各环节正常
- **THEN** 构建、归档、服务器激活全自动完成，CD 报告发布成功，无需执行任何本机命令

#### Scenario: 发布失败自动回滚
- **WHEN** 服务器激活阶段迁移或健康检查失败
- **THEN** 发布脚本自动回滚到旧版本，CD 报告失败，生产保持旧版本

#### Scenario: 并发发布互斥
- **WHEN** 上一次发布尚未结束时再次触发 CD
- **THEN** 后一次发布排队或被取消，不产生并发激活

### Requirement: 服务器自托管执行器
服务器 MUST 运行一个仅服务本仓库的自托管执行器（self-hosted runner），通过主动出站连接接收部署任务；MUST NOT 为此放宽安全组或新增入站端口；部署任务 MUST NOT 出现在可被 fork PR 触发的工作流中。

#### Scenario: 出站接取任务
- **WHEN** CD 的部署 job 开始排队
- **THEN** 服务器上的 runner 通过既有出站连接接取任务并执行

#### Scenario: fork PR 不可触及 runner
- **WHEN** 外部贡献者提交 Pull Request
- **THEN** 触发的 CI 不含任何 self-hosted runner 上的 job

### Requirement: 密钥管理
CI/CD MUST NOT 需要将服务器 SSH 私钥等长期密钥写入 GitHub Secrets；GHCR 推送使用平台内置令牌；镜像包为公开，服务器拉取无需凭证。生产环境配置文件 MUST NOT 入库，仅在服务器本地维护。

#### Scenario: 无私钥托管
- **WHEN** 检查仓库 GitHub Secrets 配置
- **THEN** 不存在服务器 SSH 私钥条目

#### Scenario: 密钥不入库
- **WHEN** 检查仓库内容与 CI/CD 日志
- **THEN** 不存在 SSH 私钥、API Key、生产 `.env` 等敏感材料
