# Tasks

## 1. AI Provider 层（API）

- [ ] 1.1 AIProvider 接口 + ProviderCapabilities（按 docs/architecture/ai-provider.md 最小化：generateStructured）
- [ ] 1.2 OpenAICompatibleProvider：chat/completions 结构化输出，配置走 AI_BASE_URL/AI_API_KEY/AI_MODEL
- [ ] 1.3 MockProvider：内置合法 Definition 模板 + 规则化改写（change 指令确定性响应），零外网
- [ ] 1.4 Provider 工厂：AI_PROVIDER 环境变量选择，默认 mock

## 2. 生成与修改端点（API）

- [ ] 2.1 Prompt 构建：Capability Registry 白名单 + schema 要求 + 当前草稿（change 场景）+ 教师意图
- [ ] 2.2 `POST /api/experiments/:id/ai/generate`：意图 → 草案提案（教师认证）
- [ ] 2.3 `POST /api/experiments/:id/ai/change`：指令 → 新 Definition + 服务端 diff 摘要
- [ ] 2.4 Repair Loop：validateExperiment → issues 回喂 → 最多 2 轮 → needsReview 兜底
- [ ] 2.5 单测：mock provider 生成/修改/修复成功路径、2 轮失败 needsReview、401 场景

## 3. Studio Copilot 面板

- [ ] 3.1 Copilot 面板替换占位按钮：意图输入 + 生成/修改模式切换
- [ ] 3.2 提案审阅视图：变更摘要 + 校验问题 + needsReview 标记
- [ ] 3.3 应用到草稿（写编辑器态 + dirty 标记）/ 丢弃（恢复原草稿）
- [ ] 3.4 提案试玩：不保存直接用提案 Definition 起本地试玩

## 4. 测试与验收

- [ ] 4.1 diff 摘要单测：节点/变量/规则增删改计数正确
- [ ] 4.2 Studio 提案应用/丢弃逻辑测试
- [ ] 4.3 全量 vitest + tsc + biome + `openspec validate phase6-teacher-ai-copilot` 通过
- [ ] 4.4 手动联调记录：mock 模式完整走「生成 → 审阅 → 应用 → 保存 → 发布」；如配置真实供应商再验证一次真实生成
