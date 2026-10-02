import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/auth/auth.service.js';

vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));

const SECRET = 'test-secret-key-123456';

function makePrisma() {
  return {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };
}

type MockPrisma = ReturnType<typeof makePrisma>;

describe('AuthService', () => {
  let prisma: MockPrisma;
  let jwt: JwtService;
  let service: AuthService;

  beforeEach(() => {
    prisma = makePrisma();
    jwt = new JwtService({ secret: SECRET, signOptions: { expiresIn: '12h' } });
    service = new AuthService(prisma as never, jwt);
  });

  it('注册成功：返回可验证的 JWT，存储的是哈希而非明文', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(
      ({ data }: { data: { username: string; passwordHash: string } }) =>
        Promise.resolve({ id: 'u1', ...data }),
    );

    const { token } = await service.register('teacher1', 'password-123');

    const payload = await jwt.verifyAsync(token);
    expect(payload.sub).toBe('u1');
    expect(payload.username).toBe('teacher1');

    const saved = prisma.user.create.mock.calls[0]![0].data as { passwordHash: string };
    expect(saved.passwordHash).not.toBe('password-123');
    expect(saved.passwordHash.startsWith('$2')).toBe(true);
  });

  it('用户名冲突：409 + AUTH_USERNAME_TAKEN，不创建账号', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', username: 'teacher1' });

    await expect(service.register('teacher1', 'password-123')).rejects.toMatchObject({
      response: { code: 'AUTH_USERNAME_TAKEN' },
    });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('登录成功返回 JWT', async () => {
    const { token: registered } = await (async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(
        ({ data }: { data: { username: string; passwordHash: string } }) =>
          Promise.resolve({ id: 'u2', ...data }),
      );
      return service.register('teacher2', 'password-456');
    })();
    void registered;

    const created = prisma.user.create.mock.results[0]!.value as Promise<{
      id: string;
      username: string;
      passwordHash: string;
    }>;
    prisma.user.findUnique.mockResolvedValue(await created);

    const { token } = await service.login('teacher2', 'password-456');
    const payload = await jwt.verifyAsync(token);
    expect(payload.username).toBe('teacher2');
  });

  it('密码错误与用户不存在返回同一个通用认证失败', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('ghost', 'password-123')).rejects.toMatchObject({
      response: { code: 'AUTH_INVALID_CREDENTIALS' },
    });
    await expect(service.login('ghost', 'password-123')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    // 注册一个真实用户后用错误密码登录
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(
      ({ data }: { data: { username: string; passwordHash: string } }) =>
        Promise.resolve({ id: 'u3', ...data }),
    );
    await service.register('teacher3', 'right-password');
    prisma.user.findUnique.mockResolvedValue(
      await (prisma.user.create.mock.results[0]!.value as Promise<unknown>),
    );

    const wrongPw = service.login('teacher3', 'wrong-password');
    await expect(wrongPw).rejects.toMatchObject({
      response: { code: 'AUTH_INVALID_CREDENTIALS' },
    });
    // 两种失败都是 UnauthorizedException（401），不区分用户名/密码错误
    await expect(service.login('ghost', 'x-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(service.login('teacher3', 'wrong-password')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('注册冲突是 ConflictException（409）', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(service.register('dup', 'password-123')).rejects.toBeInstanceOf(ConflictException);
  });
});
