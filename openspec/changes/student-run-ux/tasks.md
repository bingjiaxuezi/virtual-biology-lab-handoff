# Tasks

## 1. Runtime：BACK 命令与计分幂等

- [x] 1.1 `experiment-events`：事件枚举追加 `STEPPED_BACK`，序列化测试同步
- [x] 1.2 `experiment-runtime`：RunRecord 增加节点访问历史栈；`BACK` 命令实现（弹栈 + RESTORE_TO + 追加事件；起点/已结束拒绝）
- [x] 1.3 `experiment-runtime`：SCORE 效果幂等（RunRecord 记录已计分 ruleId，重复命中跳过 SCORE；SET/ADD/SUBTRACT 照常）
- [x] 1.4 单测：正常回退、起点拒绝、完成后拒绝、回退重答不刷分、酶温度实验回归（80→37 状态恢复且只计一次分）

## 2. API：BACK 命令透传

- [x] 2.1 dispatch 命令 Schema 接受 `BACK` 并透传 Runtime；集成测试覆盖回退事件落库

## 3. 学生端：统一操作栏与回退入口

- [x] 3.1 新增 `NodeActionBar` 组件（回退最左/主按钮最右/两步态原位切换/「第 N 步」提示）
- [x] 3.2 八种节点渲染器全部改用 `NodeActionBar`，删除各自 button-row
- [x] 3.3 组件测试：两步态切换、回退禁用态、回退点击发出 BACK

## 4. 学生端：媒体与视觉

- [x] 4.1 `.media-content` 全宽 + 16:9 + max-height ≥ 60vh；图片点击新标签看原图
- [x] 4.2 布局加宽（app-main 1280、侧栏 sticky）、面板视觉基线统一
- [x] 4.3 组件测试更新（媒体渲染断言）

## 5. 验收

- [x] 5.1 全量 `pnpm -r test` / `typecheck` / `pnpm lint` / `openspec validate --strict` 通过
- [x] 5.2 浏览器联调：巨噬细胞实验中验证统一操作栏、回退重看视频、回退改答不刷分、视频 16:9 大画面
