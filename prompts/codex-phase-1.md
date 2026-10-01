# Codex Phase 1 Prompt

请执行 `docs/plans/phase-1-exec-plan.md`。

本阶段唯一目标：

`Experiment Definition v0.1 + Capability Registry v0.1 + Zod Schema + Validator + Sample Experiment + Tests`

要求：

- 先检查设计文档，发现冲突先记录，不要静默自行改变领域模型。
- Experiment Definition 不依赖 React Flow/XState/具体 AI Provider/具体 Storage Provider。
- Validator 输出稳定的 error code/path/message。
- Sample experiment 必须通过所有 validation。
- 为关键非法场景写自动化测试。
- 不引入 UI、正式 AI SDK、对象存储 SDK。

完成后输出：

1. 修改文件清单；
2. 核心类型/Schema 说明；
3. Validator 规则表；
4. 测试结果；
5. 尚未解决的问题；
6. 是否满足 Phase 1 Done Definition。
