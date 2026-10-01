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
