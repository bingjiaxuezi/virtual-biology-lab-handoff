# Tasks

## 1. Monorepo 基础（工作包 A）

- [ ] 1.1 初始化 pnpm workspace（`pnpm-workspace.yaml`、根 `package.json`、`.npmrc`、`.gitignore`）
- [ ] 1.2 配置 TypeScript strict（根 `tsconfig.base.json`，各包继承）
- [ ] 1.3 接入 Vitest（根配置 + 各包 `vitest run` 脚本）
- [ ] 1.4 基础 lint/format（ESLint + Prettier 或 Biome，按最小侵入选择）
- [ ] 1.5 建立三个包骨架：`packages/experiment-schema`、`packages/capability-registry`、`packages/experiment-validator`，配置包间 workspace 依赖

## 2. Experiment Definition Schema（工作包 B）

- [ ] 2.1 用 Zod 定义全部顶层对象（metadata/teaching/variables/assets/nodes/transitions/rules/assessment/aiPolicy）
- [ ] 2.2 Node 使用 discriminated union（8 种类型，含各自 config：VARIABLE_INPUT 的 variableId/inputMode、MEDIA 的 assetId/mediaType 等）
- [ ] 2.3 Variable 使用 discriminated union（NUMBER/ENUM/BOOLEAN）
- [ ] 2.4 Rule Effect 使用 discriminated union（SET/ADD/SUBTRACT/SCORE）
- [ ] 2.5 Condition 与 6 种操作符的 Schema
- [ ] 2.6 Asset 引用校验：禁止出现供应商 URL（自定义 refinement）
- [ ] 2.7 `tutor.revealAnswer` 固定 false 的 Schema 约束
- [ ] 2.8 导出 `z.infer` TypeScript 类型与 JSON Schema 转换入口

## 3. Capability Registry（工作包 C）

- [ ] 3.1 定义 `NodeCapability` 条目结构（type/version/description/configSchema/aiAuthoringHint + runtimeHandler/renderer 占位）
- [ ] 3.2 注册 8 种 Node Type 条目，每个含 config schema 与 AI authoring hint
- [ ] 3.3 注册 Variable Type / Operator / Effect / Media Type 注册表
- [ ] 3.4 提供查询 API（按类型取条目、枚举全部、判断是否存在）

## 4. Validator（工作包 D）

- [ ] 4.1 定义稳定错误模型 `ValidationIssue`（code/path/message/severity）与错误码常量
- [ ] 4.2 Structural Validator：Zod parse + Zod issue 到自有错误模型的映射，失败短路
- [ ] 4.3 Semantic Validator：START 恰好一个、至少一个 END、id 唯一性、transition 端点存在
- [ ] 4.4 Semantic Validator：BFS 可达性（END 不可达 error、普通节点不可达 warning）
- [ ] 4.5 Semantic Validator：variable/asset 引用完整性
- [ ] 4.6 Semantic Validator：Condition 操作符-变量类型兼容表、Rule Effect-变量类型兼容表
- [ ] 4.7 Capability Validator：所有用到的类型必须存在于 Registry
- [ ] 4.8 `validateExperiment(def, registry)` 管线聚合输出

## 5. 样板实验（工作包 E）

- [ ] 5.1 完善 `examples/enzyme-temperature.v0.1.json`：temperature NUMBER、sampleStatus ENUM、>60℃ 分支、NORMAL/DENATURED 结果、至少一个 MEDIA、至少一个 OBSERVATION、AI Policy、合法 Transition Graph

## 6. 测试与验收（工作包 F）

- [ ] 6.1 测试：合法样板实验通过完整校验
- [ ] 6.2 测试：缺 START 失败 / 多 START 失败
- [ ] 6.3 测试：transition 指向不存在节点失败
- [ ] 6.4 测试：未定义变量引用失败
- [ ] 6.5 测试：NUMBER + GT 合法 / BOOLEAN + GT 非法
- [ ] 6.6 测试：Rule SET 类型不兼容失败
- [ ] 6.7 测试：未支持 Node Type 失败
- [ ] 6.8 测试：END 不可达失败
- [ ] 6.9 测试：不可达普通节点产生 warning、错误输出含 code/path/message/severity
- [ ] 6.10 全量 `vitest run` 通过、`tsc --noEmit` 无错误、样板 JSON 可被 Schema parse
- [ ] 6.11 确认未引入 UI/AI/Storage 依赖，`openspec validate phase1-definition-foundation` 通过
