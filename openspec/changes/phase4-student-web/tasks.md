# Tasks

## 1. 应用骨架

- [ ] 1.1 `apps/web`：Vite + React 19 + TypeScript strict 接入 monorepo（catalog 依赖、biome、pnpm 脚本）
- [ ] 1.2 API 客户端层：typed fetch 封装（目录/建 Run/开始/dispatch/事件流），统一错误处理
- [ ] 1.3 API 补充：`GET /api/catalog` 已发布实验目录（不含 draft），单测覆盖

## 2. 运行时界面

- [ ] 2.1 目录页：已发布实验列表 → 创建并开始 Run → 跳转运行页
- [ ] 2.2 运行页框架：当前节点渲染区 + 事件轨迹面板 + AI 占位区；studentId 本地生成持久化
- [ ] 2.3 八种节点渲染器（START/ACTION/VARIABLE_INPUT/MEDIA/OBSERVATION/QUESTION/CONDITION/END）+ 未知类型兜底
- [ ] 2.4 变量控件：NUMBER 滑块/步进（min/max/unit）、ENUM 选项组、BOOLEAN 开关
- [ ] 2.5 dispatch 交互：命令提交、拒绝原因展示、成功后状态刷新
- [ ] 2.6 事件轨迹面板：sequence 升序展示，dispatch 响应即时合并 + 轮询兜底
- [ ] 2.7 完成页：outcome/得分/关键事件 + 轨迹复盘

## 3. 测试与验收

- [ ] 3.1 渲染器组件测试：八种节点渲染与交互命令正确
- [ ] 3.2 会话流程测试（mock API）：目录 → 创建 → 80℃ 路径 → 完成，命令序列与状态刷新正确
- [ ] 3.3 全量 vitest + tsc + biome 通过；`openspec validate phase4-student-web` 通过
- [ ] 3.4 手动联调记录：docker-compose 起库 → API → Web，双实验各跑一遍并截图/记录
