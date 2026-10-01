import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import type { RunsService } from './runs.service.js';

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
  z.object({ type: z.literal('SUBMIT_OBSERVATION'), text: z.string() }),
  z.object({ type: z.literal('ANSWER_QUESTION'), answer: z.string() }),
  z.object({ type: z.literal('ADVANCE') }),
]);

@Controller('runs')
export class RunsController {
  constructor(private readonly runs: RunsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createRunSchema)) body: z.infer<typeof createRunSchema>) {
    return this.runs.create(body.experimentVersionId, body.studentId);
  }

  @Get(':runId')
  get(@Param('runId') runId: string) {
    return this.runs.get(runId);
  }

  @Post(':runId/start')
  start(@Param('runId') runId: string) {
    return this.runs.start(runId);
  }

  @Post(':runId/dispatch')
  dispatch(
    @Param('runId') runId: string,
    @Body(new ZodValidationPipe(dispatchCommandSchema)) command: z.infer<
      typeof dispatchCommandSchema
    >,
  ) {
    return this.runs.dispatch(runId, command);
  }

  @Post(':runId/abort')
  abort(@Param('runId') runId: string) {
    return this.runs.abort(runId);
  }
}
