# asset-media Specification Delta

## MODIFIED Requirements

### Requirement: 素材内容分发
系统 MUST 提供公开的内容端点按 assetId 流式返回文件（正确的 Content-Type 与 Content-Length）；资源未上传文件时 MUST 返回 404 `ASSET_CONTENT_MISSING`。Experiment Definition 中 MUST 仍只引用 assetId，禁止 URL。

内容端点 MUST 支持 RFC 7233 单区间 Range 请求：

- 合法 `Range: bytes=start-end`（含 `start-` 开区间与 `-suffix` 尾区间形式）→ 返回 `206 Partial Content`，字节内容与源文件对应切片一致，响应头含 `Content-Range`、`Content-Length`（切片长度）与 `Accept-Ranges: bytes`
- 无 Range 头 → `200` 全量返回，响应头含 `Accept-Ranges: bytes`
- 区间越界（start ≥ 文件大小）→ `416 Range Not Satisfiable`，响应头含 `Content-Range: bytes */<size>`
- 多区间或其他无法解析的 Range 形式 → 忽略 Range 头，回退 `200` 全量返回

Range 切片实现 MUST 基于 `StorageProvider` 接口完成（迭代 1 允许在内存中对 get 结果切片），禁止业务代码绕过 Provider 直接读文件系统。

#### Scenario: 学生端拉取媒体
- **WHEN** 学生端请求已上传资源的 content（无 Range 头）
- **THEN** 返回 200 文件流、正确 Content-Type 与 `Accept-Ranges: bytes`

#### Scenario: 内容缺失
- **WHEN** 请求仅有元数据、无实体文件的资源
- **THEN** 返回 404 ASSET_CONTENT_MISSING

#### Scenario: 合法区间请求
- **WHEN** 请求 `Range: bytes=0-1023`，资源为 4MB 视频
- **THEN** 返回 206，Content-Length 为 1024，Content-Range 为 `bytes 0-1023/<total>`，字节与源文件切片一致

#### Scenario: 开区间与尾区间
- **WHEN** 请求 `Range: bytes=1024-` 或 `Range: bytes=-500`
- **THEN** 分别返回从 1024 到末尾、或末尾 500 字节的 206 响应

#### Scenario: 区间越界
- **WHEN** 请求 `Range: bytes=99999999-`，起始位置超出文件大小
- **THEN** 返回 416，Content-Range 为 `bytes */<size>`

#### Scenario: 多区间回退
- **WHEN** 请求 `Range: bytes=0-100,200-300`
- **THEN** 忽略 Range 头，返回 200 全量内容
