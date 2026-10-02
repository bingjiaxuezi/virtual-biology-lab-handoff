/**
 * 认证集成测试：真实 PostgreSQL 上的注册/登录/冲突场景。
 * 需要 TEST_DATABASE_URL，未设置时跳过。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DATABASE_URL ? describe : describe.skip;

type PrismaClientType = import('@prisma/client').PrismaClient;

describeIf('auth (integration)', () => {
  let prisma: PrismaClientType;
  let auth: InstanceType<typeof import('../src/auth/auth.service.js').AuthService>;
  let jwt: import('@nestjs/jwt').JwtService;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const { JwtService } = await import('@nestjs/jwt');
    const { AuthService } = await import('../src/auth/auth.service.js');
    prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL! });
    jwt = new JwtService({ secret: 'integration-secret-123456' });
    auth = new AuthService(prisma as never, jwt);
    await prisma.user.deleteMany({ where: { username: { startsWith: 'it_' } } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: { startsWith: 'it_' } } });
    await prisma.$disconnect();
  });

  it('register → login → token verifiable; duplicate register rejected', async () => {
    const { token } = await auth.register('it_teacher', 'password-123');
    const payload = await jwt.verifyAsync(token);
    expect(payload.username).toBe('it_teacher');

    // 密码不落明文
    const row = await prisma.user.findUnique({ where: { username: 'it_teacher' } });
    expect(row!.passwordHash).not.toContain('password-123');

    await expect(auth.register('it_teacher', 'another-password')).rejects.toMatchObject({
      response: { code: 'AUTH_USERNAME_TAKEN' },
    });

    const login = await auth.login('it_teacher', 'password-123');
    expect((await jwt.verifyAsync(login.token)).sub).toBe(row!.id);

    await expect(auth.login('it_teacher', 'wrong-password')).rejects.toMatchObject({
      response: { code: 'AUTH_INVALID_CREDENTIALS' },
    });
  });
});
