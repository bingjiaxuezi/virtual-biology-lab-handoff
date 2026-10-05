import { Body, Controller, Get, Inject, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../auth/public.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { RunsService } from './runs.service.js';

const createRunSchema = z.object({
  experimentVersionId: z.string().min(1),
  studentId: z.string().min(1),
});

const dispatchCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SET_VARIABLE'),
    variableId: z.string().min(1),
    value: z.union([z.number(), z.string(), z.boolean()]),
  }),
  z.object({ type: z.literal('PERFORM_ACTION') }),
  z.object({ type: z.literal('SUBMIT_OBSERVATION'), text: z.string().min(1).max(4000) }),
  z.object({ type: z.literal('ANSWER_QUESTION'), answer: z.string().min(1).max(2000) }),
  z.object({ type: z.literal('JUMP_TO'), nodeId: z.string().min(1) }),
  z.object({ type: z.literal('ADVANCE') }),
  z.object({ type: z.literal('BACK') }),
]);

@Controller('runs')
export class RunsController {
  constructor(@Inject(RunsService) private readonly runs: RunsService) {}

  @Public()
  @Post()
  create(@Body(new ZodValidationPipe(createRunSchema)) body: z.infer<typeof createRunSchema>) {
    return this.runs.create(body.experimentVersionId, body.studentId);
  }

  @Public()
  @Get(':runId')
  get(@Param('runId') runId: string) {
    return this.runs.get(runId);
  }

  @Public()
  @Post(':runId/start')
  start(@Param('runId') runId: string) {
    return this.runs.start(runId);
  }

  @Public()
  @Post(':runId/dispatch')
  dispatch(
    @Param('runId') runId: string,
    @Body(new ZodValidationPipe(dispatchCommandSchema)) command: z.infer<
      typeof dispatchCommandSchema
    >,
  ) {
    return this.runs.dispatch(runId, command);
  }

  @Public()
  @Post(':runId/abort')
  abort(@Param('runId') runId: string) {
    return this.runs.abort(runId);
  }
}
