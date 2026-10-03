# 综合交接文档


---

# FILE: README.md

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

## 6. 当前明确不做

Iteration 1 不做：VR/AR、完整 3D 实验室、科研级 ODE/PDE 求解、自研视频播放器、自研状态机、自研 LMS、复杂多租户、复杂权限、支付、实验社区、模板市场、AI 自动生成高质量实验视频、AI 无审核发布、复杂开放式自动评分、Kafka/RabbitMQ/Kubernetes/LangChain 等非必要基础设施。


---

# FILE: AGENTS.md

# AGENTS.md

本仓库用于开发“AI 生物仿真实验平台”。

## 必须遵守的架构约束

- `Experiment Definition` 是实验领域唯一真值源。
- React Flow 只负责编辑/展示，不得作为持久化领域模型。
- XState 只负责 Runtime 执行，不得作为持久化模型。
- AI 只能生成 `Capability Registry` 已支持的节点、变量、操作符和效果。
- Teacher AI 产生的是 Draft/Change Proposal，不能直接发布。
- Student AI 对 Runtime 只读，不能替学生执行操作、提交答案或改变实验状态。
- Experiment Definition 中资源只引用 `assetId`，禁止写死 S3/OSS/CDN URL。
- AI Provider、Storage Provider、Media Processor 必须通过接口隔离具体供应商。
- Event Log 是事实记录；Run State 是快照。
- 优先使用成熟第三方库，不重复造通用轮子。
- Iteration 1 使用模块化单体，不主动引入微服务或消息队列。

## 开发前必读

- `docs/product/overview.md`
- `docs/product/iteration-1.md`
- `docs/architecture/overview.md`
- `docs/domain/core-model.md`
- `docs/domain/experiment-definition-v0.1.md`
- `docs/domain/capability-registry-v0.1.md`

## 复杂任务要求

涉及以下任一情况时，先更新或创建 ExecPlan，再编码：

- 领域模型变化
- Experiment Definition Schema 变化
- Capability Registry 变化
- Compiler/Runtime 行为变化
- AI 生成约束变化
- Provider 接口变化

## 当前优先级

Phase 1：

`Experiment Definition v0.1 + Capability Registry v0.1 + Zod Schema + Validator + Sample Experiment + Tests`

在 Phase 1 通过验收前，不开发完整 Teacher Studio、Student Runtime 或正式 AI 能力。


---

# FILE: docs/product/overview.md

# 产品概览

## 产品定位

面向生物实验教学的“AI 辅助实验创作与仿真运行平台”。

核心价值不是平台方预制大量实验，而是让教师能够自己创建、修改、发布和复用实验。

## 核心用户

### 教师

- 用自然语言描述实验意图
- 让 AI 生成结构化实验草稿
- 通过可视化编辑器修改步骤、变量、规则和素材
- 配置 AI 辅助策略
- 预览、发布、查看学生运行轨迹

### 学生

- 阅读实验目标、原理和 AI Briefing
- 调整参数、选择操作、观察结果
- 填写观察记录
- 在实验中获取 AI Tutor 提示
- 实验后进行 AI Review

## 产品演进层级

```text
L0 视频课程
L1 分支互动实验
L2 状态驱动实验       ← Iteration 1 目标
L3 参数化科学仿真
L4 AI/科研模型增强
```

Iteration 1 不是科研级仿真，而是 Rule-based Simulation。

## 创作方式

三种入口最终统一为 Experiment Definition：

```text
AI 创建 ─┐
模板创建 ├→ Experiment Definition → Runtime
空白创建 ┘
```

## 教师创作原则

老师始终使用教学语言，而不是技术语言。

例如老师说：

> “让学生自己调节温度，温度超过 60℃ 时出现酶失活现象。”

系统内部映射为：

- `VARIABLE_INPUT(temperature)`
- `CONDITION(temperature > 60)`
- `SET(sampleStatus = DENATURED)`
- 对应 `MEDIA/OBSERVATION` 节点

AI 负责把自然语言翻译成受控结构，但不能越过平台能力边界。


---

# FILE: docs/product/iteration-1.md

# Iteration 1 范围

## 目标

验证以下四件事：

1. AI 能生成符合结构约束的 Experiment Definition。
2. Teacher Studio 能可视化并修改 Definition。
3. 一个统一 Runtime 能运行多个 Definition，而不是按实验写页面。
4. Event Log 能完整记录学生实验过程，并为 AI Tutor/复盘提供上下文。

## 教师侧范围

### 我的实验

- 实验列表
- 新建实验
- 编辑草稿
- 发布实验

### 创建方式

- AI 创建
- 空白创建
- 模板创建可作为 Iteration 1.1；若工期紧可暂缓

### AI Copilot

支持：

- 生成实验基本信息
- 生成变量
- 生成步骤
- 生成基础规则
- 生成观察问题
- 生成评分建议
- 对话式提出修改建议
- 校验失败后的 AI Repair

所有修改必须形成 Change Proposal，由教师确认后应用。

### 编辑器节点

Iteration 1 固定：

- `START`
- `ACTION`
- `VARIABLE_INPUT`
- `MEDIA`
- `OBSERVATION`
- `QUESTION`
- `CONDITION`
- `END`

### 变量

- `NUMBER`
- `ENUM`
- `BOOLEAN`

### 规则

比较：`= != > < >= <=`

Effect：`SET ADD SUBTRACT SCORE`

流程跳转由 Transition 表达，不在 Rule 内提供 GOTO。

### 资源

- 视频
- 图片
- 文本

### 预览/发布

- 教师试玩
- 校验
- 发布

## 学生侧范围

- 实验列表/详情
- 实验前 AI Briefing
- Runtime 动态渲染
- 设置变量
- 选择操作
- 播放视频/展示图片
- 填写观察结果
- 条件跳转
- 完成实验
- AI Tutor
- AI 观察助手
- AI 实验后 Review

## AI Tutor 原则

学生 AI 可以读取：

- Experiment Definition
- Current Node
- Current State
- Experiment Events
- Student Observation
- AI Policy

Student AI 不允许：

- 直接执行 Runtime Command
- 替学生设置变量
- 替学生选择正确答案
- 替学生提交观察结果
- 修改实验 Definition

## 样板实验

“温度对酶活性的影响”至少包含：

- `temperature` 数字变量
- `sampleStatus` 枚举变量
- 一个 `temperature > 60` 条件
- 两个不同结果
- 一个视频资源
- 一个观察问题
- 一次 AI Tutor 提示
- 完整 Event Log

## 明确不做

- VR/AR
- 3D 实验室
- Blockly
- 科研级数值仿真
- LMS 深度集成
- 多学校复杂多租户
- 支付
- 实验社区/Marketplace
- AI 生成实验视频
- AI 自动最终评分
- 复杂 BI 看板


---

# FILE: docs/architecture/overview.md

# 总体架构

## 总体原则

```text
Teacher / Student
       │
       ▼
     Web App
       │
       ▼
    NestJS API
       │
 ┌─────┼───────────────────────────────┐
 ▼     ▼                               ▼
Domain AI Gateway                  Asset Service
 │      │                              │
 │   Provider Router                StorageProvider
 │   ├─ OpenAIProvider             ├─ Local/S3
 │   ├─ DeepSeekProvider           ├─ Aliyun OSS
 │   └─ Future Providers           └─ Future Providers
 │
 ▼
Experiment Definition
 │
 ├─ Validator
 ├─ Capability Validation
 ├─ Compiler
 └─ XState Adapter
       │
       ▼
Experiment Runtime
       │
       ├─ Node Renderer
       ├─ Rule Executor
       ├─ State Snapshot
       └─ Event Recorder
```

## 关键边界

### 1. Definition 与编辑器解耦

React Flow 只保存视觉布局信息或编辑状态；领域数据必须映射回 `Experiment Definition`。

### 2. Definition 与 Runtime 解耦

`Experiment Definition` 经 `Experiment Compiler` 编译成 XState Machine。不得把 XState Machine JSON 直接作为持久化模型。

### 3. Experiment 与资源存储解耦

Definition 中只存 `assetId`。真实对象存储位置由 Asset Service 管理。

### 4. AI 与供应商解耦

业务服务只依赖 `AIProvider`/`AIRouter`，不直接调用 OpenAI/DeepSeek SDK。

### 5. Run State 与 Event Log 解耦

- Event：事实
- State：当前快照

未来实验回放、错误路径分析、AI Review 均以 Event 为主要来源。

## 推荐模块

### apps/web

- Teacher Studio
- Student Runtime

### apps/api

- Auth
- Experiment
- ExperimentVersion
- ExperimentRun
- ExperimentEvent
- Asset
- AI

### packages

- experiment-schema
- experiment-domain
- capability-registry
- experiment-validator
- experiment-compiler
- experiment-runtime
- experiment-events
- ai-core
- storage-core
- shared


---

# FILE: docs/architecture/tech-stack.md

# 技术栈与复用边界

## 推荐技术栈

| 层 | 技术 | 处理方式 | 用途 |
|---|---|---|---|
| Web | React + TypeScript + Vite | 复用 | Teacher/Student Web |
| UI | MUI | 复用 | 通用 UI |
| 流程画布 | React Flow | 强复用 | 实验编排 |
| 自动布局 | ELK.js | 强复用 | AI 生成流程自动排版 |
| 表单 | JSON Forms | 强复用 | Observation/Report |
| Runtime | XState v5 | 强复用 | 状态机执行 |
| 视频 | Video.js | 强复用 | 实验视频 |
| 图表 | ECharts | 复用 | 数据曲线 |
| Schema | Zod + JSON Schema | 强复用 | Definition/AI 输出约束 |
| API | Node.js + NestJS | 复用框架 | 后端 |
| DB | PostgreSQL | 复用 | 业务数据 |
| ORM | Prisma | 复用 | DB 访问 |
| Auth | Better Auth | 复用 | Teacher/Student 登录 |
| Object Storage | S3 API / OSS / COS 等 | Provider 化 | 视频/图片 |
| AI | Provider Adapter | 半自研 | OpenAI/DeepSeek 等 |
| Test | Vitest + Playwright | 复用 | 单测/E2E |
| Repo | pnpm workspace | 复用 | Monorepo |
| Deploy | Docker（原生 docker 命令 + 发布脚本） | 复用 | MVP 部署（目标服务器无 docker compose；镜像定义与脚本见 `deploy/`，规格见 `openspec/specs/deployment`） |

## 自研部分

必须自己做：

- Experiment Definition
- Capability Registry
- Experiment Validator
- Experiment Compiler
- Experiment Runtime Domain Adapter
- Experiment Event Model
- AI Gateway / Routing / Context Builder / Policy
- Asset Domain

## 明确不自研

- Flow Canvas
- State Machine Engine
- Video Player
- Generic Form Engine
- Chart Engine
- Authentication cryptography
- Object Storage protocol
- LMS
- Scientific ODE/PDE solver

## 暂不引入

Iteration 1 不引入：

- LangChain
- Kafka
- RabbitMQ
- Redis（除非出现明确需求）
- Kubernetes
- 微服务拆分
- Blockly
- H5P Runtime 强依赖
- 3D Engine

## H5P 定位

H5P 用于研究和后续可选 Adapter。借鉴：

- 内容包思想
- Schema 驱动编辑
- Interactive Video
- Branching Scenario

不要让 H5P 成为 Experiment Definition 核心。


---

# FILE: docs/architecture/ai-provider.md

# AI Provider 架构

## 目标

支持 OpenAI、DeepSeek 以及未来其他模型供应商，并允许不同 AI Usage 使用不同 Provider/Model。

## 关键抽象

```ts
export interface AIProvider {
  readonly id: string;
  capabilities(): ProviderCapabilities;
  generateStructured<T>(request: StructuredGenerationRequest<T>): Promise<T>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  stream?(request: ChatRequest): AsyncIterable<ChatChunk>;
}
```

建议 Provider：

- `OpenAIProvider`
- `DeepSeekProvider`

未来可扩展：

- QwenProvider
- ClaudeProvider
- LocalModelProvider

## AI Usage 与 Provider 解耦

```text
experiment_generation
experiment_change
student_briefing
student_tutor
observation_assist
experiment_review
```

配置示意：

```yaml
ai:
  routes:
    experiment_generation:
      provider: openai
      model: configured-model
    student_tutor:
      provider: deepseek
      model: configured-model
```

## Provider Capability

```ts
export interface ProviderCapabilities {
  structuredOutput: boolean;
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
}
```

Teacher Copilot 的 Experiment Definition 生成应优先路由到支持可靠 Structured Output 的 Provider。

## AI 生成流程

```text
Natural Language
  ↓
AI Context Builder
  ├─ Capability Registry
  ├─ Experiment Schema
  ├─ Current Definition
  └─ Teacher Intent
  ↓
AI Provider
  ↓
Definition Draft / Change Proposal
  ↓
Structural Validation
  ↓
Semantic Validation
  ↓
Capability Validation
  ↓
Invalid → Repair Loop
Valid   → Teacher Review
```

## Teacher AI 权限

可以：

- 生成草稿
- 提出 Patch/Change Proposal
- 解释修改原因
- 根据校验错误修复草稿

不能：

- 绕过 Validator
- 直接 Publish

## Student AI 权限

只读上下文：

- Definition
- State
- Events
- Current Node
- Observation
- AI Policy

不得拥有 Experiment Command API。


---

# FILE: docs/architecture/storage-media.md

# 存储与媒体架构

## 核心原则

Experiment Definition 永远只引用 `assetId`，禁止直接保存对象存储 URL。

```text
Experiment Definition
      │
      ▼
    assetId
      │
      ▼
 Asset Service
      │
      ▼
StorageProvider
```

## Provider 抽象

```ts
export interface ObjectStorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<UploadSession>;
  createDownloadUrl(input: CreateDownloadUrlInput): Promise<string>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
  getObjectMetadata(input: ObjectRef): Promise<ObjectMetadata>;
}
```

支持目标：

- Local/S3-compatible（开发）
- AWS S3
- Aliyun OSS
- Tencent COS
- Huawei OBS
- 其他 Provider 后续添加

## ExperimentAsset

建议字段：

- id
- experimentId
- type: VIDEO / IMAGE / FILE
- storageProvider
- bucket/container
- objectKey
- originalFilename
- mimeType
- size
- status
- createdAt

## 上传流程

大文件不要经过 NestJS 中转：

```text
Browser
  │ request upload session
  ▼
API
  │ pre-signed upload URL
  ▼
Browser ─────────────→ Object Storage
  │
  └─ complete callback → API
```

## 播放流程

```text
Runtime
  ↓ assetId
Asset API
  ↓ signed URL / CDN URL
CDN / Object Storage
  ↓
Video.js
```

## Iteration 1 媒体处理

只要求支持标准 MP4/图片。不要自研转码。

预留：

```ts
interface MediaProcessor {
  process(assetId: string): Promise<ProcessedMediaResult>;
}
```

Iteration 1 使用 `NoopMediaProcessor`。

未来可以替换：

- FFmpeg Worker
- 云视频转码服务
- HLS/多码率
- Thumbnail/Poster

## CDN

生产环境视频建议接 CDN；应用服务器不承载视频流量。


---

# FILE: docs/domain/core-model.md

# 核心领域模型 v0.1

## 四个核心对象

### ExperimentDefinition

描述“实验是什么”。

包含：

- metadata
- teaching
- variables
- assets references
- nodes
- transitions
- rules
- assessment
- aiPolicy

### CapabilityRegistry

描述“平台会什么”。

包含：

- nodeTypes
- variableTypes
- operators
- effects
- mediaTypes
- renderer capabilities
- authoring hints

### ExperimentRun

描述“某个学生做了一次实验”。

必须绑定具体 `ExperimentVersion`。

包含：

- runId
- experimentVersionId
- studentId
- status
- currentNodeId
- state
- score
- startedAt/completedAt

### ExperimentEvent

描述“实验运行过程中真实发生过什么”。

包含：

- eventId
- runId
- sequence
- type
- nodeId
- payload
- stateBefore/stateAfter（可选，按成本评估）
- timestamp

## 重要约束

- Run 绑定 Version，不绑定“当前 Experiment”。
- Version 发布后不可原地修改；修改产生新 Version。
- Event sequence 在同一个 Run 内单调递增。
- State 可以从 Event 推导/校验，但 Runtime 可保存快照提升性能。
- Student AI 只能读 Run/Event，不写 Runtime。


---

# FILE: docs/domain/experiment-definition-v0.1.md

# Experiment Definition v0.1

## 目标

用一个与 UI/Runtime/AI Provider 无关的 JSON 结构描述一个教学实验。

## 顶层结构

```ts
interface ExperimentDefinition {
  schemaVersion: '0.1';
  id: string;
  version: number;
  metadata: ExperimentMetadata;
  teaching: TeachingDesign;
  variables: ExperimentVariable[];
  assets: AssetReference[];
  nodes: ExperimentNode[];
  transitions: Transition[];
  rules: Rule[];
  assessment: AssessmentConfig;
  aiPolicy: AIPolicy;
}
```

## Variables

Iteration 1：

- NUMBER
- ENUM
- BOOLEAN

NUMBER：

- defaultValue
- min
- max
- unit

ENUM：

- options
- defaultValue

BOOLEAN：

- defaultValue

自由文本 Observation 不作为实验状态变量。

## Nodes

### START

实验入口；必须唯一。

### ACTION

学生执行一个离散操作，例如“加入试剂”。

### VARIABLE_INPUT

允许学生输入/调整一个已定义变量。

配置示例：

```json
{
  "variableId": "temperature",
  "inputMode": "SLIDER"
}
```

### MEDIA

展示实验结果或过程：VIDEO / IMAGE / TEXT。

只引用 `assetId`。

### OBSERVATION

学生填写实验观察记录。

### QUESTION

结构化教学问题。

### CONDITION

用于显示/表达条件判断节点；真正流程跳转由 Transition condition 控制。

### END

实验终点；至少一个。

## Transitions

职责：决定流程“接下来去哪”。

```ts
interface Transition {
  id: string;
  from: string;
  to: string;
  condition?: Condition;
  priority?: number;
}
```

## Rules

职责：决定实验“世界状态发生什么变化”。

```ts
interface Rule {
  id: string;
  when: Condition;
  effects: RuleEffect[];
}
```

Iteration 1 Effect：

- SET
- ADD
- SUBTRACT
- SCORE

Rule 不提供 GOTO；流程变化归 Transition 管。

## Conditions

比较操作：

- EQ
- NEQ
- GT
- LT
- GTE
- LTE

所有条件必须类型安全，例如 BOOLEAN 不允许 GT。

## Assets

Definition 中只记录逻辑引用：

```json
{
  "id": "video_denatured",
  "assetId": "asset_123",
  "type": "VIDEO"
}
```

真实存储位置不进入领域模型。

## Assessment

Iteration 1 支持：

- 初始分
- Rule Effect SCORE
- 完成条件
- 基础结果汇总

不做开放式报告的 AI 最终评分。

## AI Policy

```ts
interface AIPolicy {
  briefing: { enabled: boolean };
  tutor: {
    enabled: boolean;
    hintLevel: 'LIGHT' | 'STANDARD' | 'STRONG';
    allowExplainTheory: boolean;
    allowPointOutWrongDirection: boolean;
    revealAnswer: false;
  };
  observationAssist: { enabled: boolean };
  review: { enabled: boolean };
}
```

`revealAnswer` 在 Iteration 1 默认且建议固定为 false。


---

# FILE: docs/domain/capability-registry-v0.1.md

# Capability Registry v0.1

## 目标

定义“当前版本的平台到底支持什么”，并同时服务于：

- AI 生成约束
- Teacher Studio 节点库
- Definition Validation
- Runtime Renderer/Handler 选择

## 初始能力

### Variable Types

- NUMBER
- ENUM
- BOOLEAN

### Node Types

- START
- ACTION
- VARIABLE_INPUT
- MEDIA
- OBSERVATION
- QUESTION
- CONDITION
- END

### Operators

- EQ
- NEQ
- GT
- LT
- GTE
- LTE

### Effects

- SET
- ADD
- SUBTRACT
- SCORE

### Media Types

- VIDEO
- IMAGE
- TEXT

## Registry Entry 建议结构

```ts
interface NodeCapability {
  type: NodeType;
  version: string;
  description: string;
  configSchema: unknown;
  runtimeHandler: string;
  renderer: string;
  aiAuthoringHint: string;
}
```

## AI 使用方式

老师说：

> “让学生自己调温度。”

AI 根据 Registry 中 `VARIABLE_INPUT` 的说明选择该能力。

老师要求当前不支持的能力时，例如“实时电子显微镜 3D 仿真”，AI 不应虚构 Node Type，而应：

1. 识别 capability gap；
2. 告知当前不支持；
3. 尽可能使用现有能力降级实现，例如图片/视频 + Variable + Observation；
4. 生成的 Definition 仍必须只包含 Registry 已支持类型。

## Registry 与代码关系

不要只写一个字符串数组。最终 Registry 应成为节点能力插件入口，可关联：

- config schema
- editor metadata
- runtime handler
- renderer
- validator
- AI authoring hint


---

# FILE: docs/domain/runtime-event-model.md

# Runtime / Run / Event 模型

## Runtime 输入

- Experiment Definition（固定 Version）
- Initial State
- Student Identity
- Runtime Policy

## Runtime 职责

- 加载 Definition
- 调用 Validator/Compiler
- 建立 XState Runtime
- 渲染当前 Node
- 接收合法 Student Command
- 更新 State
- 记录 Event
- 保存 Snapshot

## Run Status

Iteration 1 建议：

- CREATED
- RUNNING
- COMPLETED
- ABORTED

## 核心 Event Types

- RUN_STARTED
- NODE_ENTERED
- ACTION_PERFORMED
- VARIABLE_CHANGED
- OBSERVATION_SUBMITTED
- QUESTION_ANSWERED
- RULE_APPLIED
- TRANSITION_TAKEN
- AI_BRIEFING_VIEWED
- AI_HINT_REQUESTED
- AI_HINT_SHOWN
- AI_OBSERVATION_ASSISTED
- AI_REVIEW_GENERATED
- RUN_COMPLETED

## Event 原则

- Event append-only
- 同一 Run 内 sequence 单调递增
- 不通过修改历史 Event 修正状态
- 必要时使用补偿/纠正 Event

## AI 上下文

Student Tutor Context Builder 从以下来源构建上下文：

```text
Definition
+ Current Node
+ Current State
+ 最近 N 条 Events / 摘要
+ Student Observation
+ AI Policy
```

不要把完整无限历史无脑塞给模型；后续可引入摘要策略。


---

# FILE: docs/plans/phase-1-exec-plan.md

# Phase 1 ExecPlan

## 目标

完成：

`Experiment Definition v0.1 + Capability Registry v0.1 + Zod Schema + Validator + Sample Experiment + Tests`

## 非目标

本阶段不开发完整 UI、正式 AI Provider 调用、正式对象存储上传、Student Runtime 页面。

## 工作包 A：Monorepo 基础

- pnpm workspace
- TypeScript strict
- Vitest
- 基础 lint/format
- 建立 packages：experiment-schema / capability-registry / experiment-validator

## 工作包 B：Experiment Definition Schema

- 用 Zod 定义所有顶层对象
- 导出 TypeScript 类型
- 可转换 JSON Schema
- Node 使用 discriminated union
- Variable 使用 discriminated union
- Rule Effect 使用 discriminated union

## 工作包 C：Capability Registry

实现 Iteration 1 初始能力，并为 Node Capability 提供：

- type
- version
- config schema
- description
- aiAuthoringHint

## 工作包 D：Validator

### Structural Validator

- Zod parse

### Semantic Validator

至少检查：

- START 恰好一个
- 至少一个 END
- END 可达
- node id 唯一
- transition id 唯一
- transition from/to 存在
- variable id 唯一
- variable 引用存在
- asset 引用存在
- Condition 操作符与变量类型兼容
- Rule Effect 与变量类型兼容
- 不可达节点报告 warning/error（先明确策略）

### Capability Validator

所有类型都必须存在于当前 Registry。

## 工作包 E：样板实验

创建：

`examples/enzyme-temperature.v0.1.json`

要求：

- temperature NUMBER
- sampleStatus ENUM
- >60℃ 分支
- NORMAL / DENATURED 两种结果
- 至少一个 MEDIA
- 至少一个 OBSERVATION
- AI Policy
- 合法 Transition Graph

## 工作包 F：测试

至少包括：

1. 合法样板实验通过
2. 缺 START 失败
3. 多 START 失败
4. transition 指向不存在节点失败
5. 未定义变量引用失败
6. NUMBER + GT 合法
7. BOOLEAN + GT 非法
8. Rule SET 类型不兼容失败
9. 未支持 Node Type 失败
10. END 不可达失败

## Done Definition

- 所有测试通过
- TypeScript 无错误
- Sample JSON 可被 Schema parse
- Validator 输出稳定的 error code/path/message
- 文档与实现一致
- 未引入 UI/AI/Storage 的多余依赖


---

# FILE: docs/product/acceptance-criteria.md

# Iteration 1 验收标准

## 业务闭环

最终 Iteration 1 必须演示：

### 教师

1. 登录
2. 点击 AI 创建实验
3. 输入“温度对酶活性的影响”描述
4. AI 返回符合 Capability Registry 的 Definition Draft
5. Definition 通过 Validation；失败时 AI Repair
6. 画布自动显示流程
7. 教师修改变量/步骤
8. 绑定视频/图片
9. 设置 Observation
10. 配置 AI Policy
11. 预览
12. 发布 Version

### 学生

1. 打开实验
2. 查看 AI Briefing
3. 开始 Run
4. 设置 temperature = 80℃
5. Runtime 进入高温分支
6. 展示对应媒体/实验现象
7. 学生填写观察
8. 学生请求 AI Tutor 提示
9. AI 根据当前 State/Event 给提示，但不直接替学生操作
10. 学生调整为 37℃ 并继续
11. 完成实验
12. AI 生成个性化 Review

### 教师复盘

能够查看该 Run 的关键事件轨迹，例如：

```text
RUN_STARTED
VARIABLE_CHANGED 25 → 80
TRANSITION_TAKEN high_temperature
OBSERVATION_SUBMITTED
AI_HINT_REQUESTED
AI_HINT_SHOWN
VARIABLE_CHANGED 80 → 37
RUN_COMPLETED
```

## 技术验收

- 实验页面不是按实验类型写死
- Definition 与 React Flow/XState 解耦
- AI Provider 可配置
- Storage Provider 可配置
- Definition 不存供应商 URL
- Event append-only
- Run 固定绑定 ExperimentVersion


---

# FILE: docs/product/open-questions.md

# 待后续决策问题

这些问题不阻塞 Phase 1，但在后续 Phase 需要确认：

1. Experiment Version 发布后是否完全 immutable？建议是。
2. Draft 修改模型：同一 Draft 覆盖还是 Draft Revision？Iteration 1 可先覆盖。
3. Student Run 是否允许重置/重做？建议新建 Run，不复用历史 Run。
4. AI Tutor 是否在考试模式完全关闭？建议由 AI Policy 控制。
5. Observation TEXT 是否允许 AI 整理后保留原始文本 + AI 结构化结果两份？建议保留两份。
6. 是否需要单独的 `Outcome` 领域对象？v0.1 暂不需要，先通过 State + MEDIA + Transition 表达。
7. 是否需要 Rich Text 格式规范？建议后续限定 Markdown 子集。
8. 视频上传大小、编码、时长限制需结合部署环境决定。
9. 对象存储首个生产 Provider 选择：AWS S3 / Aliyun OSS / Tencent COS 等，部署前再定。
10. OpenAI/DeepSeek 具体模型名称与计费策略应作为运行配置，不固化进领域设计。
