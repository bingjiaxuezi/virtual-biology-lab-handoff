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
