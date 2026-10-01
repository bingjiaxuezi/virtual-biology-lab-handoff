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
| Deploy | Docker Compose | 复用 | MVP 部署 |

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
