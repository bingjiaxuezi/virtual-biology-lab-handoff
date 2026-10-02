# asset-media Specification

## Purpose
TBD - created by archiving change phase8-asset-media. Update Purpose after archive.

## Requirements

### Requirement: Storage Provider 接口隔离
素材文件存取 MUST 通过 `StorageProvider` 接口（put/get/delete）进行，禁止业务代码直接操作文件系统或对象存储 SDK。迭代 1 SHALL 提供本地磁盘实现（`STORAGE_DIR` 配置），storageKey MUST 经白名单校验以防路径穿越。

#### Scenario: 本地磁盘存取往返
- **WHEN** 通过 LocalDiskStorageProvider put 一个文件后 get
- **THEN** 返回字节与原文件一致

#### Scenario: 非法 key 被拒
- **WHEN** storageKey 含 `..` 或绝对路径
- **THEN** 拒绝读写并抛出错误

### Requirement: 素材上传
系统 MUST 提供教师上传端点：multipart 文件 + 资源类型；MUST 按类型校验 MIME 白名单（IMAGE: png/jpg/jpeg/webp/gif；VIDEO: mp4/webm；TEXT: txt/md）并在超限时返回 413；上传成功后写入 Asset 记录（含 storageKey/mimeType/sizeBytes）并返回 assetId。上传端点 MUST 要求教师 JWT。大小上限 MUST 由环境变量 `ASSET_MAX_UPLOAD_MB` 配置，缺省值 200（MB）；配置非法（非正数）时 MUST 回退缺省值。

#### Scenario: 合法图片上传
- **WHEN** 教师上传 2MB 的 PNG 并声明 IMAGE 类型
- **THEN** 文件落盘、Asset 记录创建、返回 assetId

#### Scenario: 类型不符被拒
- **WHEN** 上传 EXE 文件或 MIME 与声明类型不匹配
- **THEN** 返回 400，不产生任何文件或记录

#### Scenario: 默认上限容纳大视频
- **WHEN** 未配置 `ASSET_MAX_UPLOAD_MB`，教师上传 119MB 的 MP4
- **THEN** 上传成功

#### Scenario: 超过配置上限被拒
- **WHEN** 配置 `ASSET_MAX_UPLOAD_MB=10`，教师上传 20MB 的 MP4
- **THEN** 返回 413，不产生任何文件或记录

### Requirement: 素材内容分发
系统 MUST 提供公开的内容端点按 assetId 流式返回文件（正确的 Content-Type 与 Content-Length）；资源未上传文件时 MUST 返回 404 `ASSET_CONTENT_MISSING`。Experiment Definition 中 MUST 仍只引用 assetId，禁止 URL。

#### Scenario: 学生端拉取媒体
- **WHEN** 学生端请求已上传资源的 content
- **THEN** 返回文件流与正确 Content-Type

#### Scenario: 内容缺失
- **WHEN** 请求仅有元数据、无实体文件的资源
- **THEN** 返回 404 ASSET_CONTENT_MISSING

### Requirement: 端侧渲染与降级
学生端 MEDIA 节点 MUST 按 mediaType 实际渲染（IMAGE→图片、VIDEO→可播放视频、TEXT→文本）；内容缺失或加载失败时 MUST 降级为占位卡片，不阻塞实验流程。Studio MUST 支持在资源面板上传文件并写入 Definition 的 assets 声明。

#### Scenario: 视频正常播放
- **WHEN** MEDIA 节点引用已上传的视频资源
- **THEN** 学生端渲染可播放的视频控件

#### Scenario: 未上传资源降级
- **WHEN** MEDIA 节点引用仅有元数据的资源
- **THEN** 学生端显示占位卡片，学生可继续实验

### Requirement: 批量素材导入工具
系统 SHALL 提供命令行批量导入脚本，扫描指定目录中的媒体文件（按扩展名映射 IMAGE/VIDEO/TEXT），经教师认证后逐个调用上传端点，并输出 `文件名 → assetId` 的映射 JSON。单个文件失败 MUST 记录并继续处理其余文件，结束后输出成功/失败汇总。

#### Scenario: 批量导入目录
- **WHEN** 对含 40 个 MP4 与 15 张图片的目录执行导入脚本
- **THEN** 全部文件经上传端点入库，输出映射 JSON，定义编写可按文件名查得 assetId

#### Scenario: 部分失败不中断
- **WHEN** 目录中某个文件上传失败（如超限或网络错误）
- **THEN** 该文件记入失败清单，其余文件继续导入，脚本退出码非零并在汇总中列明失败项
