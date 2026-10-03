# Tasks

## 1. 修复

- [ ] 1.1 新增共享回退实现（各端本地函数）：优先 `crypto.randomUUID()`，其次 `crypto.getRandomValues` 拼 UUIDv4，最后 `Math.random` 兜底
- [ ] 1.2 改造 4 个调用点：`apps/web/src/student.ts`、`apps/studio/src/pages/ExperimentListPage.tsx`、`packages/experiment-events/src/event-log.ts`、`packages/experiment-runtime/src/runtime.ts`

## 2. 验证与发布

- [ ] 2.1 `pnpm -r test` 与 `pnpm -r build` 通过
- [ ] 2.2 CI 全绿后触发 CD 发布，服务器手动同步 web/studio dist（Phase 2 前的手工步骤）
- [ ] 2.3 浏览器验证 HTTP + IP 下学生端不再白屏、可正常进入实验
