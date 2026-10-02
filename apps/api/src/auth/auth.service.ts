import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  /** 注册即教师；用户名冲突返回稳定错误码，密码只存哈希。 */
  async register(username: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException({ code: 'AUTH_USERNAME_TAKEN' });
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({ data: { username, passwordHash } });
    return { token: await this.sign(user.id, user.username) };
  }

  /** 登录：用户名或密码任一错误都返回同一个通用失败，不泄露账号是否存在。 */
  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !ok) {
      throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS' });
    }
    return { token: await this.sign(user.id, user.username) };
  }

  private sign(userId: string, username: string) {
    return this.jwt.signAsync({ sub: userId, username });
  }
}
