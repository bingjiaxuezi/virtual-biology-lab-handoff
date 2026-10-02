# Tasks

## 1. 上传上限可配置

- [x] 1.1 `ASSET_MAX_UPLOAD_MB` 环境变量解析（默认 200，非法值回退默认），FileInterceptor 限制随之调整；Studio 提示文案同步
- [x] 1.2 测试覆盖默认值、自定义与非法回退（`.env.example` 的完整增补归并到 add-deployment 提案，避免混合归属）

## 2. 批量导入脚本

- [x] 2.1 `apps/api/scripts/import-assets.ts`：目录扫描（--skip 排除重复/备选文件）、扩展名→类型/MIME 映射、教师登录、逐个上传、输出 `import/asset-map.json`，部分失败不中断
- [x] 2.2 对 `import/实验视频/` 实际执行导入：64 个文件全部成功（跳过 2 个重复副本 + 31 号备选视频）

## 3. 实验定义编写

- [x] 3.1 选择点假设经用户逐条确认（A/D/F/G/H/I/J）
- [x] 3.2 编写 `examples/macrophage-phagocytosis.v0.1.json`：两幕流程、10 个选择点（ENUM + SELECT + 条件分支 + 结果视频汇合，判定题答错循环重答）、9 条 SCORE 规则（满分 90）、46 个素材引用
- [x] 3.3 `validateExperiment` 零 error，加入 validator 与 runtime 测试夹具（全对路径 90 分、错误分支汇合、判定题循环单次计分）

## 3.5 规则求值语义修复（实现中发现的缺陷）

- [x] 3.5.1 `evaluateRules` 增加 `changedVariableId` 过滤：只求值 `when` 引用变量发生变化的 Rule，修复无关 SET_VARIABLE 导致计分规则重复触发
- [x] 3.5.2 `experiment-runtime` 规格 delta 补充三个场景；既有 16 个运行时测试全部保持通过

## 4. 入库与验收

- [x] 4.1 创建实验记录并发布 v1（experiment id `9bac7c5b-ef2c-4d07-8858-1f1ec62bb827`）
- [x] 4.2 浏览器端到端：Studio 画布分支结构正确（变量10/规则9/资源46）；学生端选错"背部皮肤"→ 正确进入错误分支并播放对应视频（内容接口字节数与源文件一致）
- [x] 4.3 事件轨迹核对：RUN_STARTED/NODE_ENTERED/TRANSITION_TAKEN/VARIABLE_CHANGED/QUESTION_ANSWERED/ACTION_PERFORMED 按序落库
- [x] 4.4 全量 `pnpm -r test`（138 通过）/ `typecheck` / `pnpm lint` / `openspec validate --strict` 通过
