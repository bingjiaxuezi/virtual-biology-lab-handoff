# Delta for asset-media

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: 批量素材导入工具
系统 SHALL 提供命令行批量导入脚本，扫描指定目录中的媒体文件（按扩展名映射 IMAGE/VIDEO/TEXT），经教师认证后逐个调用上传端点，并输出 `文件名 → assetId` 的映射 JSON。单个文件失败 MUST 记录并继续处理其余文件，结束后输出成功/失败汇总。

#### Scenario: 批量导入目录
- **WHEN** 对含 40 个 MP4 与 15 张图片的目录执行导入脚本
- **THEN** 全部文件经上传端点入库，输出映射 JSON，定义编写可按文件名查得 assetId

#### Scenario: 部分失败不中断
- **WHEN** 目录中某个文件上传失败（如超限或网络错误）
- **THEN** 该文件记入失败清单，其余文件继续导入，脚本退出码非零并在汇总中列明失败项
