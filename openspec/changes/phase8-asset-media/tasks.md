# Tasks

## 1. Storage Provider（API）

- [x] 1.1 `StorageProvider` 接口（put/get/delete）+ token 注入
- [x] 1.2 LocalDiskStorageProvider：STORAGE_DIR 落盘，key 白名单校验防路径穿越
- [x] 1.3 单测：put/get/delete 往返、非法 key 拒绝

## 2. Asset 模型与上传（API）

- [x] 2.1 Prisma 迁移：Asset 增加 storageKey/mimeType/sizeBytes（可空）
- [x] 2.2 `POST /api/assets/upload`：multipart、MIME 白名单（IMAGE: png/jpg/jpeg/webp/gif；VIDEO: mp4/webm；TEXT: txt/md）、大小上限 50MB
- [x] 2.3 `GET /api/assets/:assetId/content`：流式分发；无文件 404 ASSET_CONTENT_MISSING
- [x] 2.4 集成测试：上传 → 元数据 → 内容回读；类型不符 400；超大 413

## 3. Studio

- [x] 3.1 资源面板：上传控件（选文件 → 上传 → 写入 definition.assets 并标记已上传）
- [x] 3.2 MEDIA 节点属性：资源未上传文件时显示提示标记

## 4. 学生端

- [x] 4.1 MediaNodeView：IMAGE/VIDEO/TEXT 实际渲染，内容缺失降级占位卡
- [x] 4.2 组件测试：三种类型渲染 + 缺失降级

## 5. 验收

- [x] 5.1 全量 vitest + tsc + biome + openspec validate 通过
- [x] 5.2 手动联调：Studio 上传图片/视频 → 绑定 MEDIA 节点 → 发布 → 学生端正常显示/播放
