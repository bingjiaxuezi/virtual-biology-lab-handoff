/** 上传大小上限配置：ASSET_MAX_UPLOAD_MB（MB），默认 200，非法值回退默认。 */
export const DEFAULT_MAX_UPLOAD_MB = 200;

export function resolveMaxUploadBytes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.ASSET_MAX_UPLOAD_MB;
  if (raw == null || raw.trim() === '') return DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
  const mb = Number(raw);
  if (!Number.isFinite(mb) || mb <= 0) return DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
  return Math.floor(mb) * 1024 * 1024;
}
