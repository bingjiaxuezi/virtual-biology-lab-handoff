# Tasks

## 1. 建库脚本

- [x] 1.1 `scripts/ensure-database.mjs`：解析 DATABASE_URL，连接维护库，目标库不存在则创建（库名白名单校验防注入）

## 2. 幂等种子

- [x] 2.1 初始教师账号：不存在则创建（bcrypt 哈希），存在则跳过
- [x] 2.2 样板实验：经 Zod + 三层校验后建 Experiment + 发布版本 1；按 definition.id 判重
- [x] 2.3 样板实验引用的 Asset 自动注册（upsert by assetId）

## 3. 接线与文档

- [x] 3.1 package.json：`prisma.seed` 配置 + `db:setup` 串联脚本
- [x] 3.2 README/运维文档补充一键初始化说明

## 4. 验收

- [x] 4.1 对全新库名跑 `db:setup`：建库 + 迁移 + 种子一次成功
- [x] 4.2 对已有开发库重复执行：全部跳过、零副作用
- [x] 4.3 全量测试 + typecheck + biome + openspec validate 通过
