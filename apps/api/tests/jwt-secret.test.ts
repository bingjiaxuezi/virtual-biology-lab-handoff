import { describe, expect, it } from 'vitest';
import { resolveJwtSecret } from '../src/auth/jwt-secret.js';

describe('resolveJwtSecret', () => {
  it('环境变量有效时优先使用', () => {
    expect(resolveJwtSecret({ JWT_SECRET: 'a-very-strong-secret' } as never)).toBe(
      'a-very-strong-secret',
    );
  });

  it('生产环境缺失密钥：启动失败而非静默用弱默认值', () => {
    expect(() => resolveJwtSecret({ NODE_ENV: 'production' } as never)).toThrow(/JWT_SECRET/);
    expect(() =>
      resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'short' } as never),
    ).toThrow(/JWT_SECRET/);
  });

  it('本地开发缺失密钥：回退到明确的弱默认值', () => {
    const secret = resolveJwtSecret({} as never);
    expect(secret.length).toBeGreaterThan(0);
    expect(secret).toContain('dev-only');
  });
});
