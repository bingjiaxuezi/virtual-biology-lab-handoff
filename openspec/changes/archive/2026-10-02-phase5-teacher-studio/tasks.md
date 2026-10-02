# Tasks

## 1. 教师认证（API）

- [x] 1.1 Prisma 新增 User 模型（id/username 唯一/passwordHash/createdAt）+ 迁移
- [x] 1.2 安装 bcryptjs、@nestjs/jwt；AuthModule：register/login 端点 + JWT 签发（密钥走 `JWT_SECRET` 环境变量）
- [x] 1.3 全局 AuthGuard + `@Public()` 装饰器；catalog/版本读取/Run 创建读取 dispatch 标注公开，其余默认鉴权
- [x] 1.4 认证单测 + e2e：注册/登录/401 场景、学生端点公开性

## 2. API 补充

- [x] 2.1 `GET /api/experiments/:id/runs` 教师端 Run 列表端点（认证，按开始时间倒序）+ 测试
- [x] 2.2 草稿/发布端点接入守卫后的既有测试适配

## 3. Studio 骨架

- [x] 3.1 `apps/studio`：Vite + React 19 + TS strict 接入 monorepo（biome、pnpm 脚本、@xyflow/react、dagre）
- [x] 3.2 认证页与路由守卫：登录/注册表单、token 本地持久化、API 客户端自动带 Authorization、401 跳登录
- [x] 3.3 实验列表页：草稿状态/版本号展示、空白新建（最小骨架 Definition）、删除、发布按钮（透出校验问题）

## 4. 可视化编辑器

- [x] 4.1 Definition → nodes/edges 派生层 + dagre 自动布局（坐标只在前端内存）
- [x] 4.2 八类节点自定义渲染（CONDITION 区分 onTrue/onFalse 出边）
- [x] 4.3 节点属性表单：标题/变量绑定/媒体/题目/条件表达式/效果编辑，写回 Definition
- [x] 4.4 图上操作：增删节点、按语义连线（next/onTrue/onFalse）、删除连线
- [x] 4.5 变量/规则/资源编辑面板
- [x] 4.6 校验问题面板：变更即跑 Validator，severity 分级展示，点击定位节点
- [x] 4.7 保存草稿（PUT Definition）+ 未保存变更提示

## 5. 试玩与轨迹

- [x] 5.1 试玩模式：浏览器内 experiment-runtime + InMemoryEventLog 加载当前草稿，复用学生端节点渲染语义，全程零 API 请求
- [x] 5.2 学生轨迹页：实验 → Run 列表 → 事件流只读查看
- [x] 5.3 AI Copilot 占位按钮（明确标注未上线，无网络请求）

## 6. 测试与验收

- [x] 6.1 派生层与表单写回的单测；试玩流程测试（走酶温度实验 80℃ 路径）
- [x] 6.2 全量 vitest + tsc + biome + `openspec validate phase5-teacher-studio` 通过
- [x] 6.3 手动联调记录：起库 + API + Studio，注册 → 新建 → 编辑 → 校验 → 试玩 → 发布 → 学生端跑一遍 → 轨迹查看
