import { Body, Controller, Inject, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuthService } from './auth.service.js';
import { Public } from './public.decorator.js';

const credentialsSchema = z.object({
  username: z.string().min(3).max(32),
  // bcrypt 只取前 72 字节，超出部分无意义
  password: z.string().min(8).max(72),
});

@Public()
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(credentialsSchema)) body: z.infer<typeof credentialsSchema>,
  ) {
    return this.auth.register(body.username, body.password);
  }

  @Post('login')
  login(@Body(new ZodValidationPipe(credentialsSchema)) body: z.infer<typeof credentialsSchema>) {
    return this.auth.login(body.username, body.password);
  }
}
