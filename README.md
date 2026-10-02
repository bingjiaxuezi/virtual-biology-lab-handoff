# AI 生物仿真实验平台

以"教师自主创作"为核心的 AI 辅助生物仿真实验教学平台。教师用自然语言 AI / 可视化编辑器创建实验，平台将实验保存为统一的 **Experiment Definition**；学生通过统一 **Runtime** 执行实验，全程记录事件，并在实验前、中、后获得受教师策略约束的 AI 辅助。

本 README 同时是**重建手册**：拿到本仓库（或一份旧实验素材压缩包）的协作者/AI，应按本文档即可搭建、理解并扩展整个系统。

---

## 1. 第一性原则（不可违反）

1. **创作权属于教师**：AI 只产出草稿与修改建议，教师审核后才发布。
2. **Experiment Definition 是唯一领域真值源**：AI、编辑器、Runtime、Validator 都围绕它工作。React Flow / XState 只是投影与执行器，绝不作为持久化模型。
3. **AI 不创造平台不存在的能力**：只能组合 `Capability Registry` 已声明的节点、变量、操作符与效果。
4. **统一 Runtime**：不为单个实验写页面；所有实验由同一 Runtime 读 Definition 执行。
5. **过程数据是一等公民**：Event Log 是 append-only 事实记录；Run State 只是当前快照。
6. **基础设施可插拔**：AI Provider、Storage Provider 均通过接口隔离供应商。
7. **Definition 中资源只引用 `assetId`**，禁止出现任何 URL。

架构决策详见 `docs/decisions/`，领域模型见 `docs/domain/`。

## 2. 技术栈与仓库结构

pnpm monorepo + TypeScript 严格模式，模块化单体（Iteration 1 不引入微服务）。

```text
apps/
  api/       NestJS 11 + Prisma + PostgreSQL（端口 3000，全局前缀 /api）
  studio/    教师端 React 19 + Vite + React Flow（端口 5174，需登录）
  web/       学生端 React 19 + Vite（端口 5173，免登录，本地学生标识）
packages/
  experiment-schema/      Definition v0.1 的 Zod Schema（唯一结构真值）
  experiment-validator/   领域校验（引用完整性、图连通、条件类型安全等）
  experiment-runtime/     Definition → XState 状态机编译与命令派发
  experiment-events/      事件类型与 append-only Event Log
  capability-registry/    能力注册表（AI 生成约束 + 编辑器节点库 + 校验依据）
openspec/    OpenSpec 规格与变更（强制工作流，见第 6 节）
examples/    示例实验 Definition（酶温度、巨噬细胞吞噬）
docs/        产品/架构/领域文档
```

运行时数据流：`Definition(JSON) → Validator → Compiler → XState Machine → 命令(SET_VARIABLE/ADVANCE/…) → Event Log + Run State`。

## 3. 快速开始

前置：Node ≥ 20、pnpm 10、PostgreSQL 16（本地或容器均可）。

```bash
pnpm install

# 一键建库 + 迁移 + 幂等种子（教师账号 + 样板实验 + 示例资源）
# 库不存在会自动创建；可反复执行，已有数据自动跳过
cd apps/api
$env:DATABASE_URL = "postgresql://vlab:vlab_dev_password@localhost:5432/virtual_biology_lab"  # PowerShell
pnpm db:setup   # ensure-database → migrate deploy → seed

# 启动三个端（仓库根目录）
pnpm --filter @virtual-biology-lab/api dev      # API :3000
pnpm --filter @virtual-biology-lab/studio dev   # 教师端 :5174
pnpm --filter @virtual-biology-lab/web dev      # 学生端 :5173
```

内置账号与环境：

- 教师端登录：`teacher_dev` / `dev-password-123`（种子创建，仅开发用；可用 `SEED_TEACHER_USERNAME` / `SEED_TEACHER_PASSWORD` 覆盖，数据库只存 bcrypt 哈希）
- 学生端免登录，自动生成 `stu_xxxxxxxx` 本地标识
- API 读取 `apps/api/.env`（不入库），模板见 `.env.example`；AI 默认 Mock Provider（离线可用），接真实模型配置 `AI_PROVIDER=openai-compatible` + `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`（已验证 DeepSeek `deepseek-chat` 可用）
- 素材文件默认落盘 `apps/api/storage/`（`STORAGE_DIR` 可配，已 gitignore）；上传上限 `ASSET_MAX_UPLOAD_MB`，默认 200MB
- 注意：Windows 上执行 `prisma migrate` 前需先停止正在运行的 API 进程（DLL 文件锁）

## 4. 能力清单（Capability Registry v0.1）

- 节点：`START` `ACTION` `VARIABLE_INPUT` `MEDIA` `OBSERVATION` `QUESTION` `CONDITION` `END`
- 变量：`NUMBER` `ENUM` `BOOLEAN`；输入模式 `SLIDER` `NUMBER_INPUT` `SELECT` `TOGGLE`
- 条件操作符：`EQ NEQ GT LT GTE LTE`；规则效果：`SET ADD SUBTRACT SCORE`
- 媒体：`VIDEO IMAGE TEXT`

**关键语义（踩过的坑，务必遵守）**：

- `QUESTION` 不绑定变量、**不能驱动分支**。凡"选择 → 正误结果分支"必须用 `VARIABLE_INPUT(ENUM, SELECT)` + Transition 条件。
- `CONDITION` 节点仅用于画布表达；真正跳转由 Transition 的 `condition` + `priority` 决定。分支出边必须覆盖全部枚举值，否则流程卡死。
- Rule 只在 `when` 引用的变量**发生变化时**求值（修复过"任意赋值重放全部命中规则"的重复计分缺陷）。因此 **ENUM 变量的 `defaultValue` 绝不能是正确答案**，否则学生未作答即得分。
- `SET_VARIABLE` 只在变量自己的 `VARIABLE_INPUT` 节点上被接受；赋值后需显式 `ADVANCE` 推进。
- Definition 支持回环（如"答错 → 提醒 → 回到选择点"），XState 状态可被重入。

## 5. API 概览（前缀 /api）

| 端点 | 说明 |
| --- | --- |
| `POST /auth/login` | 教师登录，返回 JWT |
| `POST/GET/PUT/DELETE /experiments` | 实验草稿 CRUD |
| `POST /experiments/:id/publish` | 发布为不可变 ExperimentVersion |
| `GET /experiments/:id/runs` | 教师查看运行列表 |
| `POST /assets/upload` | 教师上传素材（multipart，MIME 白名单 + 大小上限） |
| `GET /assets/:assetId/content` | 公开媒体流分发（学生端用，无需登录） |
| `GET /catalog` | 学生端已发布实验目录 |
| `POST /runs` → `POST /runs/:id/start` → `POST /runs/:id/dispatch` | 创建运行 / 启动 / 派发命令（`SET_VARIABLE` `ADVANCE` 等） |
| `GET /runs/:id/events` | 事件轨迹 |
| `POST /runs/:id/ai/briefing`、`hint`、`observation-assist`、`review` | 学生 AI（每 Run 限额 5/20/20/5，超限 429） |
| `POST /experiments/:id/ai/generate`、`/ai/change` | 教师 AI Copilot（产出草稿/Change Proposal，教师确认后才应用） |

错误统一 `{ code, message }` 结构；AI 输出经 Zod 校验 + 自动修复循环，持续失败返回 502。

## 6. OpenSpec 强制工作流

本仓库所有功能/行为/模型变更必须走 OpenSpec（`@fission-ai/openspec`）：

1. `openspec new change <name>` 建提案 → 写 `proposal.md` / `design.md` / `specs/**/spec.md`（delta）/ `tasks.md`（中文撰写，SHALL/MUST 保留英文）
2. `openspec validate <name> --strict` 通过后**等待确认**再实现
3. 按 `tasks.md` 勾选推进；实现不得偏离已批准的 spec delta
4. 完成后 `openspec archive <name> --yes`，delta 合并进 `openspec/specs/`

正式规格在 `openspec/specs/`，与 `docs/` 冲突时先解决冲突再开发。领域模型 / Schema / Registry / Runtime / AI 约束 / Provider 接口变化还必须先更新 ExecPlan（见 `AGENTS.md`）。

## 7. 从素材包重建实验（Import Playbook）

拿到一个旧实验的素材压缩包（操作视频、结果图片等）时，按 `import-macrophage-experiment` 变更（`openspec/changes/archive/2026-10-02-import-macrophage-experiment/`）验证过的路径执行：

1. **解压到 `import/<实验名>/`**（该目录已 gitignore），通读文件名还原教学结构。编号 + "正确/错误"标注通常就是选择点与分支。
2. **批量上传素材**：

   ```bash
   cd apps/api
   node --import tsx scripts/import-assets.ts --dir "../../import/<实验名>" `
     --out "../../import/asset-map.json" --skip "重复文件1,备选文件2"
   ```

   产出 `文件名 → assetId` 映射。注意：脚本必须给 multipart Blob 显式设置 MIME，否则被服务端白名单 400 拒绝；超过 `ASSET_MAX_UPLOAD_MB` 的文件 413。
3. **编写 Definition**（参考 `examples/macrophage-phagocytosis.v0.1.json`）：
   - 顺序操作：`MEDIA(VIDEO)` + `ACTION` 成对；
   - 选择点：ENUM 变量 + `VARIABLE_INPUT(SELECT)` + 条件分支播放正误结果视频后汇合；判定题可用"错误分支回环到选择点"；
   - 计分：每个选择点一条 `SCORE` 规则（`when 变量 EQ 正确选项`），变量默认值设为错误选项；
   - 观察与思考：`OBSERVATION` / `QUESTION`；结果图：`MEDIA(IMAGE)`。
4. **校验与测试**：把示例加入 `packages/experiment-validator/tests` 与 `experiment-runtime/tests` 夹具，至少覆盖"全对路径满分 / 错误分支汇合 / 回环单次计分"。
5. **入库发布**：`POST /experiments`（draft = 定义）→ `POST /experiments/:id/publish`，然后浏览器端到端走一遍（至少一条全对路径 + 一条含错误选择的路径），教师端 Runs 页核对事件轨迹。

## 8. 测试与验收

```bash
pnpm lint               # biome
pnpm -r typecheck       # 全仓 tsc
pnpm -r test            # vitest；API 集成测试需要 TEST_DATABASE_URL
```

业务验收标准见 `docs/product/acceptance-criteria.md`（教师/学生/复盘三闭环 + 技术验收）。

## 9. 部署

部署方案（Docker 镜像 + 服务器原生 `docker run` + 统一 Nginx，复用 story-network 模式）见待实施提案 `openspec/changes/add-deployment/`（含 Dockerfile、发布/上传脚本、nginx 模板与操作守则）。

## 10. 深入阅读顺序

1. `AGENTS.md`
2. `docs/product/overview.md` → `iteration-1.md`
3. `docs/architecture/overview.md` → `tech-stack.md`
4. `docs/domain/core-model.md` → `experiment-definition-v0.1.md` → `capability-registry-v0.1.md` → `runtime-event-model.md`
5. `docs/plans/phase-1-exec-plan.md`
6. `docs/product/acceptance-criteria.md`
7. `openspec/specs/`（正式规格）与 `openspec/changes/archive/`（历次变更记录）

## 11. 当前明确不做

Iteration 1 不做：VR/AR、完整 3D 实验室、科研级 ODE/PDE 求解、自研视频播放器、自研状态机、自研 LMS、复杂多租户、复杂权限、支付、实验社区、模板市场、AI 自动生成高质量实验视频、AI 无审核发布、复杂开放式自动评分、Kafka/RabbitMQ/Kubernetes/LangChain 等非必要基础设施。
