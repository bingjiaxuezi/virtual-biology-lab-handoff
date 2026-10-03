# 素材内容 Range 流式分发

## 为什么

学生端播放实验视频时，API 的素材内容端点忽略 `Range` 请求头，始终返回 `200 + 完整文件`。浏览器播放 mp4 依赖 Range 请求先取 moov 元数据并支持拖动，缺失时只能从头顺序下载：在服务器上行带宽约 1MB/s 的现状下，一段 4.5MB/12s 的视频要等约 10 秒才能起播，且无法拖动进度。

## 变更内容

- `GET /api/assets/:assetId/content` 支持 RFC 7233 单区间 Range 请求：
  - 合法 `Range: bytes=start-end`（含 `start-`、`-suffix` 形式）→ `206 Partial Content`，返回对应字节切片，带 `Content-Range` / `Content-Length` / `Accept-Ranges: bytes`
  - 无 Range 头 → 保持现状 `200` 全量返回，并附带 `Accept-Ranges: bytes`
  - 区间越界（start ≥ size）→ `416 Range Not Satisfiable`，带 `Content-Range: bytes */size`
  - 多区间等不支持的形式 → 忽略 Range 头，回退 `200` 全量返回
- 实现位置限定在 AssetsService/Controller 层基于现有 `StorageProvider.get` 的字节切片，**不改 Storage Provider 接口**，未来 OSS/S3 实现可平滑升级为原生 Range 下载。
- 补充 API 集成测试覆盖 206 / 200 / 416 / 多区间回退四种场景。

## 影响

- 规格：`asset-media`（修改「素材内容分发」需求）
- 代码：`apps/api/src/assets/`（controller、service）、`apps/api/tests/`
- 前端无需改动：浏览器 `<video>` 原生使用 Range
- 部署无新增配置项
