# ADR-002：AI 与存储必须可插拔

## 决策

AI 通过 AIProvider/AIRouter 抽象；对象存储通过 ObjectStorageProvider 抽象。

## 初始实现

AI：OpenAIProvider + DeepSeekProvider 接口位。

Storage：本地/S3-compatible + 云厂商 Adapter 接口位。

## 约束

领域模型不得出现具体 SDK 类型、厂商 URL 或 Provider 私有字段。
