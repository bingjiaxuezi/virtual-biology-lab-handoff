import { Module } from '@nestjs/common';
import { ExperimentsController } from './experiments.controller.js';
import { ExperimentsService } from './experiments.service.js';

@Module({
  controllers: [ExperimentsController],
  providers: [ExperimentsService],
})
export class ExperimentsModule {}
