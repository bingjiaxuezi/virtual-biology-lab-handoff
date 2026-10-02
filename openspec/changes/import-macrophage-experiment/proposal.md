# 导入旧实验：小鼠腹腔巨噬细胞吞噬鸡红细胞（交互式视频实验）

## Why

用户旧项目沉淀了一个完整的交互式视频实验：43 个操作/结果视频 + 20 张结果图片（`import/实验视频/`，约 1.9GB），内容为经典的"小鼠腹腔巨噬细胞吞噬鸡红细胞"实验。其结构是典型的"操作演示 → 选择点 → 正误结果分支 → 汇合"教学模式，与本平台 `VARIABLE_INPUT(ENUM/SELECT) + Transition 条件分支 + MEDIA` 能力天然契合。

当前迁移存在两个缺口：

- 上传上限 50MB，而素材中有 12 个视频超过该上限（最大 119MB），无法入库；
- 43 个视频手工逐个上传不可行，缺少批量导入手段。

## What Changes

- **上传上限可配置**（修改 `asset-media` 规格）：新增 `ASSET_MAX_UPLOAD_MB` 环境变量，默认从 50MB 提升为 200MB，覆盖全部现有素材。
- **规则求值语义修复**（修改 `experiment-runtime` 规格）：Rule 仅在 `when` 引用的变量发生变化时求值。原实现在任意 SET_VARIABLE 时全量重放所有命中规则，多选择点实验会被重复计分（本实验 9 个计分规则会把 90 分刷到数百分）。
- **批量素材导入**（`asset-media` 新增工具需求）：提供一次性脚本 `apps/api/scripts/import-assets.ts`，扫描目录、按扩展名推断类型、调用上传 API 批量入库，输出 `文件名 → assetId` 映射 JSON 供定义编写引用。
- **实验定义产物**：编写 `examples/macrophage-phagocytosis.v0.1.json`——
  - 8 个选择点映射为 ENUM 变量 + `VARIABLE_INPUT(SELECT)`，Transition 条件分支播放对应正误结果视频后汇合主线；
  - 顺序操作步骤映射为 MEDIA(VIDEO) + ACTION；
  - 吞噬现象观察映射为 OBSERVATION，思考题映射为 QUESTION；
  - 结果图片（只有巨噬细胞/有杂质/阳性对照等）映射为 MEDIA(IMAGE)；
  - 选择正确性通过 rules 的 SCORE effect 计分。
- **入库与验收**：脚本创建实验记录、关联已上传素材、发布版本，浏览器端到端验证分支播放与计分。

## Capabilities

### New Capabilities

（无新增能力域）

### Modified Capabilities

- `asset-media`：上传大小上限改为环境变量可配置（默认 200MB）；新增批量导入工具需求。
- `experiment-runtime`：Rule 求值限定为 `when` 引用变量发生变化的时机。

## 影响

- API 上传端点读取新环境变量，默认行为变化（50MB → 200MB），向后兼容（更小文件不受影响）；
- 新增一次性脚本与示例 JSON，不影响运行时行为；
- 约 1.9GB 素材写入本地磁盘存储目录（已 gitignore）；`import/实验视频 (2).zip`（1.19GB，疑似重复压缩包）不入库、不上传；
- 部分选择点的"哪个选项算正确"仅能从文件名推断（如 `4前臂后侧皮肤错误` / `5头后侧皮肤正确`），无法从文件名判断的将在 design.md 中逐条列出假设，实现前由用户确认。
