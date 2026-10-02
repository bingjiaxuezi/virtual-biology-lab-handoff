import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { describe, expect, it, vi } from 'vitest';
import { AuthGuard } from '../src/auth/auth.guard.js';
import { IS_PUBLIC_KEY } from '../src/auth/public.decorator.js';

const SECRET = 'test-secret-key-123456';

function makeContext(request: Record<string, unknown>, isPublic: boolean) {
  const reflector = new Reflector();
  vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: unknown) =>
    key === IS_PUBLIC_KEY ? isPublic : undefined,
  );
  const context = {
    getHandler: () => () => {},
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, reflector };
}

describe('AuthGuard', () => {
  const jwt = new JwtService({ secret: SECRET });

  it('@Public() 路由直接放行，无需令牌', async () => {
    const { context, reflector } = makeContext({}, true);
    const guard = new AuthGuard(jwt, reflector);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('缺少 Authorization 头：401 + AUTH_TOKEN_MISSING', async () => {
    const { context, reflector } = makeContext({ headers: {} }, false);
    const guard = new AuthGuard(jwt, reflector);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: 'AUTH_TOKEN_MISSING' },
    });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('伪造/过期令牌：401 + AUTH_TOKEN_INVALID', async () => {
    const bad = await new JwtService({ secret: 'other-secret-key-999' }).signAsync({ sub: 'u1' });
    const { context, reflector } = makeContext(
      { headers: { authorization: `Bearer ${bad}` } },
      false,
    );
    const guard = new AuthGuard(jwt, reflector);
    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: 'AUTH_TOKEN_INVALID' },
    });

    const expired = await new JwtService({
      secret: SECRET,
      signOptions: { expiresIn: '0s' },
    }).signAsync({ sub: 'u1' });
    const ctx2 = makeContext({ headers: { authorization: `Bearer ${expired}` } }, false);
    await expect(
      new AuthGuard(jwt, ctx2.reflector).canActivate(ctx2.context),
    ).rejects.toMatchObject({ response: { code: 'AUTH_TOKEN_INVALID' } });
  });

  it('有效令牌放行并把教师信息挂到 request 上', async () => {
    const token = await jwt.signAsync({ sub: 'u1', username: 'teacher1' });
    const request = { headers: { authorization: `Bearer ${token}` } };
    const { context, reflector } = makeContext(request, false);
    const guard = new AuthGuard(jwt, reflector);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((request as { teacher?: { sub: string } }).teacher?.sub).toBe('u1');
  });
});
