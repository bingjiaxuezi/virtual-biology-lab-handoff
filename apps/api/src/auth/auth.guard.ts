import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
interface HttpRequest {
  headers: { authorization?: string | undefined };
}
import { IS_PUBLIC_KEY } from './public.decorator.js';

export interface TeacherPayload {
  sub: string;
  username: string;
}

/** 全局守卫：默认要求有效 JWT，@Public() 标注的路由放行。 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<HttpRequest & { teacher?: TeacherPayload }>();
    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException({ code: 'AUTH_TOKEN_MISSING' });
    }
    try {
      const payload = await this.jwt.verifyAsync<TeacherPayload>(token);
      request.teacher = payload;
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_TOKEN_INVALID' });
    }
    return true;
  }

  private extractBearer(request: HttpRequest): string | undefined {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) return undefined;
    const token = header.slice('Bearer '.length).trim();
    return token.length > 0 ? token : undefined;
  }
}
