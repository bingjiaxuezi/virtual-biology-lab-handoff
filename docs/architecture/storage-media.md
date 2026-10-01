# 存储与媒体架构

## 核心原则

Experiment Definition 永远只引用 `assetId`，禁止直接保存对象存储 URL。

```text
Experiment Definition
      │
      ▼
    assetId
      │
      ▼
 Asset Service
      │
      ▼
StorageProvider
```

## Provider 抽象

```ts
export interface ObjectStorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<UploadSession>;
  createDownloadUrl(input: CreateDownloadUrlInput): Promise<string>;
  deleteObject(input: DeleteObjectInput): Promise<void>;
  getObjectMetadata(input: ObjectRef): Promise<ObjectMetadata>;
}
```

支持目标：

- Local/S3-compatible（开发）
- AWS S3
- Aliyun OSS
- Tencent COS
- Huawei OBS
- 其他 Provider 后续添加

## ExperimentAsset

建议字段：

- id
- experimentId
- type: VIDEO / IMAGE / FILE
- storageProvider
- bucket/container
- objectKey
- originalFilename
- mimeType
- size
- status
- createdAt

## 上传流程

大文件不要经过 NestJS 中转：

```text
Browser
  │ request upload session
  ▼
API
  │ pre-signed upload URL
  ▼
Browser ─────────────→ Object Storage
  │
  └─ complete callback → API
```

## 播放流程

```text
Runtime
  ↓ assetId
Asset API
  ↓ signed URL / CDN URL
CDN / Object Storage
  ↓
Video.js
```

## Iteration 1 媒体处理

只要求支持标准 MP4/图片。不要自研转码。

预留：

```ts
interface MediaProcessor {
  process(assetId: string): Promise<ProcessedMediaResult>;
}
```

Iteration 1 使用 `NoopMediaProcessor`。

未来可以替换：

- FFmpeg Worker
- 云视频转码服务
- HLS/多码率
- Thumbnail/Poster

## CDN

生产环境视频建议接 CDN；应用服务器不承载视频流量。
