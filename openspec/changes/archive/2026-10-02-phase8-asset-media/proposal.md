# Phase 8：素材与媒体服务（图片/视频真正可插入、可播放）

## Why

当前 Asset 只有元数据登记（assetId / type / name），没有实体文件：

- 教师端只能「声明」资源，无法上传图片/视频，AI 生成实验里的资源全是空壳占位；
- 学生端 MEDIA 节点只渲染占位卡片，样板实验要求的「一个视频资源」实际播不了；
- AGENTS.md 要求 Storage Provider 接口隔离，目前该接口尚不存在。

这直接卡住 Iteration 1 闭环中的「绑定图片/视频等资源」一步。

## What Changes

- **Storage Provider**：新增 `StorageProvider` 接口（put/get/delete）与本地磁盘实现（`STORAGE_DIR`，默认 `apps/api/storage`，gitignored），为后续 OSS/S3 预留。
- **Asset 模型**：迁移新增可空列 `storageKey` / `mimeType` / `sizeBytes`；未上传文件的资源保持合法（学生端降级为占位卡）。
- **API**：
  - `POST /api/assets/upload`（教师 JWT，multipart）：按声明类型校验 MIME 白名单与大小上限（默认 50MB），落盘 + 建记录，返回 assetId；
  - `GET /api/assets/:assetId/content`（公开）：流式返回文件，带 Content-Type/Length/Cache-Control；未上传返回 404 `ASSET_CONTENT_MISSING`；
  - 既有 register/list/get 保持不变。
- **Studio**：资源面板支持上传（选文件 → 上传 → 自动写入 definition.assets）；MEDIA 节点属性显示「未上传文件」标记。
- **学生端**：MediaNodeView 按 mediaType 渲染 `<img>` / `<video controls>` / 文本；内容缺失时保持现有占位卡。
- Definition 仍只引用 assetId，架构约束不变。

## Capabilities

### New Capabilities

- `asset-media`：素材存储与分发——Storage Provider 隔离、上传校验、内容分发、端侧渲染与缺失降级。

## 影响

- 数据库迁移（Asset 加 3 个可空列），向后兼容；
- Definition schema 不变；运行时行为不变；
- 上传端点需教师 JWT；内容端点公开（与学生 runs 端点一致）。
