# Spec Delta

## Purpose

定义平台的生产部署契约：构建产物形态、容器镜像内容、发布与健康检查流程、环境变量配置要求，使部署可重复、可回滚、可验证。

## ADDED Requirements

### Requirement: 生产构建产物
API MUST 以编译后的 JavaScript 产物（`tsc` 输出）作为生产运行入口，MUST NOT 在生产环境依赖 tsx 等 TypeScript 即时执行器；`apps/web` 与 `apps/studio` MUST 产出纯静态构建产物，可交由 Nginx 直接托管。

#### Scenario: API 生产启动
- **WHEN** 在生产容器中启动 API
- **THEN** 进程以 `node` 直接运行编译产物启动，不加载 tsx

#### Scenario: 开发模式不受影响
- **WHEN** 开发者运行 `dev` 脚本
- **THEN** 仍使用 tsx watch 等开发模式，行为不变

#### Scenario: 前端静态产物
- **WHEN** 对 `apps/web` 或 `apps/studio` 执行构建
- **THEN** 产出不依赖 Node 运行时的静态文件目录，可被任意静态文件服务器托管

### Requirement: 容器镜像内容
每个可部署组件 MUST 提供可复现的镜像构建定义；镜像 MUST NOT 包含源码目录、开发依赖、`.env` 文件或任何密钥；运行时配置 MUST 全部通过环境变量注入。

#### Scenario: 镜像不包含密钥
- **WHEN** 检查构建出的 API 镜像文件系统
- **THEN** 不存在 `.env` 文件与仓库中的密钥材料

#### Scenario: 配置外部化
- **WHEN** 使用不同环境变量值启动同一镜像
- **THEN** 应用按注入的环境变量连接对应数据库与端口，无需重建镜像

### Requirement: 数据库迁移随发布执行
发布流程 MUST 在启动新版本 API 容器之前执行数据库迁移（`prisma migrate deploy`）；迁移失败 MUST 中止发布且 MUST NOT 启动新版本容器。

#### Scenario: 迁移成功后启动
- **WHEN** 发布新版本且迁移成功
- **THEN** 新版本 API 容器被启动并替换旧容器

#### Scenario: 迁移失败中止
- **WHEN** 数据库迁移命令返回非零退出码
- **THEN** 发布脚本退出，旧版本容器保持运行

### Requirement: 发布健康检查与回滚
发布脚本 MUST 在新容器启动后执行健康检查；健康检查连续失败 MUST 触发回滚到上一可用版本，并输出新版本日志以便诊断。

#### Scenario: 健康检查通过
- **WHEN** 新容器启动后健康检查在重试窗口内成功
- **THEN** 发布完成，旧镜像保留用于后续回滚

#### Scenario: 健康检查失败回滚
- **WHEN** 新容器健康检查在重试窗口内持续失败
- **THEN** 移除新容器，以上一可用镜像重新启动，并输出失败容器日志

### Requirement: 环境变量契约
仓库 MUST 维护 `.env.example` 作为环境变量契约，列出全部必需与可选变量及用途说明；生产环境缺少必需变量时，服务 MUST 启动失败并给出明确错误，MUST NOT 静默使用不安全的默认值。

#### Scenario: 契约与实现一致
- **WHEN** 新增一个必需环境变量
- **THEN** `.env.example` 中同步出现该变量的说明条目

#### Scenario: 缺少必需变量
- **WHEN** 生产启动时缺少 `DATABASE_URL`
- **THEN** 进程以明确错误信息退出，不进入服务状态
