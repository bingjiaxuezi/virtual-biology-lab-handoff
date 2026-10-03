import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/** 生产环境启动前校验必需环境变量，缺失时以明确错误退出。 */
function validateRequiredEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`生产环境缺少必需环境变量: ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  validateRequiredEnv();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
