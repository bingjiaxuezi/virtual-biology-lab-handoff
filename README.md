# AI 生物仿真实验平台｜Codex 交接包

## 1. 项目一句话

这是一个以“教师自主创作”为核心的 AI 辅助生物仿真实验教学平台。

教师通过自然语言 AI、模板和可视化编辑器创建实验；平台把实验保存为统一的 `Experiment Definition`；学生通过统一 `Experiment Runtime` 执行实验，系统记录完整实验过程，并在实验前、中、后提供可控的 AI 辅助。

## 2. 第一性原则

1. **创作权属于教师**：AI 负责生成草稿、提出修改建议和降低配置成本，最终内容由教师审核、修改和发布。
2. **Experiment Definition 是唯一领域真值源**：AI、编辑器、Runtime、Validator 都围绕它工作。
3. **AI 不创造平台不存在的能力**：AI 只能组合 `Capability Registry` 已声明的能力。
4. **统一 Runtime**：不同实验不写不同页面，统一读取 Definition 动态运行。
5. **过程数据是一等公民**：`Experiment Event` 记录学生真实操作路径；`Experiment Run.state` 只是当前快照。
6. **基础设施可插拔**：AI Provider、Object Storage、媒体处理均通过 Adapter/Provider 隔离具体供应商。
7. **优先复用成熟轮子**：不要自研流程画布、状态机、播放器、表单引擎、图表、认证、对象存储协议等通用能力。

## 3. Iteration 1 成功标准

跑通以下闭环：

```text
教师描述实验
   ↓
AI 生成受约束的 Experiment Definition Draft
   ↓
Schema + Domain + Capability Validation
   ↓
教师在可视化编辑器中修改
   ↓
绑定图片/视频等资源
   ↓
教师预览并发布
   ↓
学生打开实验
   ↓
Runtime 按 Definition 执行
   ↓
学生调整变量/做选择/观察/记录
   ↓
AI Tutor 在实验前、中、后提供受教师策略约束的辅助
   ↓
系统记录完整 Experiment Event
   ↓
教师查看本次运行轨迹
```

样板实验固定为：**温度对酶活性的影响**。

## 4. 阅读顺序

Codex 或新开发者应按以下顺序阅读：

1. `AGENTS.md`
2. `docs/product/overview.md`
3. `docs/product/iteration-1.md`
4. `docs/architecture/overview.md`
5. `docs/architecture/tech-stack.md`
6. `docs/domain/core-model.md`
7. `docs/domain/experiment-definition-v0.1.md`
8. `docs/domain/capability-registry-v0.1.md`
9. `docs/domain/runtime-event-model.md`
10. `docs/plans/phase-1-exec-plan.md`
11. `docs/product/acceptance-criteria.md`

## 5. 推荐仓库结构

```text
virtual-biology-lab/
├── AGENTS.md
├── README.md
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── experiment-schema/
│   ├── experiment-domain/
│   ├── capability-registry/
│   ├── experiment-validator/
│   ├── experiment-compiler/
│   ├── experiment-runtime/
│   ├── experiment-events/
│   ├── ai-core/
│   ├── storage-core/
│   └── shared/
├── docs/
├── examples/
└── schemas/
```

## 6. 本地开发快速启动

```bash
pnpm install

# 数据库一键引导：库不存在则创建 → 版本化迁移 → 幂等种子（教师账号+样板实验）
cd apps/api
$env:DATABASE_URL = "postgresql://vlab:vlab_dev_password@localhost:5432/virtual_biology_lab"  # Windows PowerShell
pnpm db:setup
```

- `db:setup` 可反复执行：已存在的账号/实验/资源自动跳过，零副作用；新环境首跑一次即可就绪。
- 初始教师账号默认 `teacher_dev` / `dev-password-123`，可用 `SEED_TEACHER_USERNAME` / `SEED_TEACHER_PASSWORD` 覆盖；数据库只存 bcrypt 哈希。
- AI 能力默认使用 Mock Provider（离线可用）；接入真实供应商时在 `apps/api/.env` 配置 `AI_PROVIDER=openai-compatible` 与 `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL`。

## 7. 当前明确不做

Iteration 1 不做：VR/AR、完整 3D 实验室、科研级 ODE/PDE 求解、自研视频播放器、自研状态机、自研 LMS、复杂多租户、复杂权限、支付、实验社区、模板市场、AI 自动生成高质量实验视频、AI 无审核发布、复杂开放式自动评分、Kafka/RabbitMQ/Kubernetes/LangChain 等非必要基础设施。
