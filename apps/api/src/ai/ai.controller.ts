import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AiService } from './ai.service.js';

const generateSchema = z.object({ intent: z.string().min(1).max(4000) });
const changeSchema = z.object({ instruction: z.string().min(1).max(4000) });

/** 教师 AI 端点：默认全局守卫要求 JWT，学生端无入口。 */
@Controller('experiments')
export class AiController {
  constructor(@Inject(AiService) private readonly ai: AiService) {}

  @Post(':id/ai/generate')
  generate(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(generateSchema)) body: z.infer<typeof generateSchema>,
  ) {
    return this.ai.generate(id, body.intent);
  }

  @Post(':id/ai/change')
  change(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeSchema)) body: z.infer<typeof changeSchema>,
  ) {
    return this.ai.change(id, body.instruction);
  }
}
