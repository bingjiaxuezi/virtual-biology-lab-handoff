const DEV_ONLY_SECRET = 'dev-only-insecure-jwt-secret';

/**
 * JWT 密钥解析：优先环境变量 JWT_SECRET；生产环境缺失时直接抛错，
 * 本地开发回退到明确的弱默认值。
 */
export function resolveJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (>=16 chars) in production');
  }
  return DEV_ONLY_SECRET;
}
