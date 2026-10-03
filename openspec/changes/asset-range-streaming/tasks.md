# Tasks

## 1. 服务端 Range 支持

- [x] 1.1 AssetsService.getContent 支持可选 range 参数，返回字节切片与区间元信息（start/end/total）
- [x] 1.2 Controller 解析 Range 头（`bytes=start-end` / `start-` / `-suffix`），输出 206/200/416 及对应响应头（Content-Range、Accept-Ranges、Content-Length）
- [x] 1.3 多区间与无法解析的 Range 头回退 200 全量

## 2. 测试与验收

- [x] 2.1 集成测试：合法区间 206（字节内容与源文件切片一致）、无 Range 200、越界 416、多区间回退 200
- [x] 2.2 `pnpm -r test` / `pnpm -r typecheck` / `pnpm lint` / `openspec validate --strict` 全绿
- [ ] 2.3 部署到服务器后用 `curl -H "Range: bytes=0-1023"` 验证 206，并确认学生端视频可拖动
