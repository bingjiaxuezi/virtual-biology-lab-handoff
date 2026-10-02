import { describe, expect, it } from 'vitest';
import { DEFAULT_MAX_UPLOAD_MB, resolveMaxUploadBytes } from '../src/assets/assets.config.js';

const MB = 1024 * 1024;

describe('resolveMaxUploadBytes', () => {
  it('未配置时默认 200MB（可容纳 119MB 视频）', () => {
    expect(resolveMaxUploadBytes({})).toBe(DEFAULT_MAX_UPLOAD_MB * MB);
    expect(DEFAULT_MAX_UPLOAD_MB).toBe(200);
  });

  it('按环境变量配置', () => {
    expect(resolveMaxUploadBytes({ ASSET_MAX_UPLOAD_MB: '10' })).toBe(10 * MB);
  });

  it('非法值回退默认', () => {
    expect(resolveMaxUploadBytes({ ASSET_MAX_UPLOAD_MB: 'abc' })).toBe(200 * MB);
    expect(resolveMaxUploadBytes({ ASSET_MAX_UPLOAD_MB: '-5' })).toBe(200 * MB);
    expect(resolveMaxUploadBytes({ ASSET_MAX_UPLOAD_MB: '' })).toBe(200 * MB);
  });
});
