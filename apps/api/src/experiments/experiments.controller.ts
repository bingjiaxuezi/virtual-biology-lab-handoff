import { Body, Controller, Delete, Get, Inject, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ExperimentsService } from './experiments.service.js';

const createDraftSchema = z.object({
  title: z.string().min(1),
  draft: z.unknown(),
});

const updateDraftSchema = z.object({
  title: z.string().min(1).optional(),
  draft: z.unknown().optional(),
});

@Controller('experiments')
export class ExperimentsController {
  constructor(@Inject(ExperimentsService) private readonly experiments: ExperimentsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createDraftSchema)) body: z.infer<typeof createDraftSchema>) {
    return this.experiments.create(body.title, body.draft);
  }

  @Get()
  list() {
    return this.experiments.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.experiments.get(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDraftSchema)) body: z.infer<typeof updateDraftSchema>,
  ) {
    return this.experiments.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.experiments.remove(id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.experiments.publish(id);
  }

  @Get(':id/versions')
  versions(@Param('id') id: string) {
    return this.experiments.versions(id);
  }
}
