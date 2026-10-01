# Tasks

## 1. 基础设施

- [ ] 1.1 docker-compose.yml：PostgreSQL 16（数据卷、健康检查），`.env.example` 与配置加载
- [ ] 1.2 apps/api 骨架：NestJS + TypeScript strict，接入 monorepo（tsconfig、biome 覆盖、pnpm 脚本）
- [ ] 1.3 Prisma 初始化：schema（Experiment/ExperimentVersion/ExperimentRun/ExperimentEvent/Asset）、migrate、client 生成接入

## 2. Event Log 持久化

- [ ] 2.1 `PrismaEventLog` 适配器：实现 EventLog 接口，事务内分配 sequence，(runId, sequence) 唯一约束
- [ ] 2.2 集成测试：append/并发冲突/重启后读取一致（可用 TEST_DATABASE_URL 跳过）

## 3. 教师侧：草稿与发布

- [ ] 3.1 Experiments 模块：草稿 CRUD（保存时结构校验，语义问题作 warning 返回）
- [ ] 3.2 发布端点：三层校验全过才生成 ExperimentVersion（JSONB 快照 + 递增版本号），失败返回完整问题列表
- [ ] 3.3 Assets 模块：assetId/类型/元数据登记，无 URL 字段
- [ ] 3.4 测试：CRUD、校验失败禁发布、发布后旧版本不变、版本号递增

## 4. 学生侧：运行编排

- [ ] 4.1 Runs 模块：从已发布 Version 创建 Run（CREATED）与开始（RUNNING）
- [ ] 4.2 dispatch 端点：快照恢复 → Runtime 执行 → 事务落库事件与快照；拒绝时零副作用
- [ ] 4.3 查询端点：Run 当前状态、按 sequence 有序事件流
- [ ] 4.4 测试：未发布版本不可运行、非法命令零副作用、重启恢复后续跑、轨迹完整单调

## 5. 验收

- [ ] 5.1 端到端脚本/集成测试：建草稿→校验→发布→建 Run→80℃ 高温路径→事件轨迹完整落库
- [ ] 5.2 全量 vitest + tsc + biome 通过；`openspec validate phase3-api-persistence` 通过
- [ ] 5.3 确认未引入 AI SDK/对象存储/前端依赖
