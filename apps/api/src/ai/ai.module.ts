import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AI_PROVIDER } from './provider.js';
import { resolveAIProvider } from './resolve-provider.js';

@Module({
  controllers: [AiController],
  providers: [AiService, { provide: AI_PROVIDER, useFactory: () => resolveAIProvider() }],
  exports: [AI_PROVIDER],
})
export class AiModule {}
