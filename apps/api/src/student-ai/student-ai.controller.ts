import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../auth/public.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { StudentAiService } from './student-ai.service.js';

const observationAssistSchema = z.object({ draftText: z.string().max(4000) });

/** 学生 AI 端点：与学生 runs 端点一致保持公开，门控由 aiPolicy 在服务端执行。 */
@Public()
@Controller('runs')
export class StudentAiController {
  constructor(@Inject(StudentAiService) private readonly studentAi: StudentAiService) {}

  @Post(':runId/ai/briefing')
  briefing(@Param('runId') runId: string) {
    return this.studentAi.briefing(runId);
  }

  @Post(':runId/ai/hint')
  hint(@Param('runId') runId: string) {
    return this.studentAi.hint(runId);
  }

  @Post(':runId/ai/observation-assist')
  observationAssist(
    @Param('runId') runId: string,
    @Body(new ZodValidationPipe(observationAssistSchema))
    body: z.infer<typeof observationAssistSchema>,
  ) {
    return this.studentAi.observationAssist(runId, body.draftText);
  }

  @Post(':runId/ai/review')
  review(@Param('runId') runId: string) {
    return this.studentAi.review(runId);
  }
}
