# fix-insecure-context-uuid

## 背景

IP + HTTP 访问（非安全上下文）时，浏览器只在安全上下文（HTTPS/localhost）暴露 `crypto.randomUUID`，学生端启动即抛 `TypeError: crypto.randomUUID is not a function`，整页白屏；教师端新建实验、Runtime/事件日志的 UUID 生成也存在同样隐患。

## 目标

所有前端可触及的 UUID 生成点增加非安全上下文回退（`crypto.getRandomValues` 生成 UUIDv4，最后兜底 `Math.random`），使平台在 HTTP + IP 的临时访问形态下可用。

## 范围

- `apps/web/src/student.ts`（学生 ID 生成，白屏直接原因）
- `apps/studio/src/pages/ExperimentListPage.tsx`（新建实验 definition id）
- `packages/experiment-events/src/event-log.ts`、`packages/experiment-runtime/src/runtime.ts`（已有本地包装函数，改其实现）

API 服务端（Node）不受影响。

## 非目标

- 不引入新依赖。
- 不改变 UUID 的格式与用途，仅增加回退路径。
