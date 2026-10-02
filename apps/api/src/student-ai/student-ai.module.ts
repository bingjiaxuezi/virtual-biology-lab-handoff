import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module.js';
import { StudentAiController } from './student-ai.controller.js';
import { StudentAiService } from './student-ai.service.js';

@Module({
  imports: [AiModule],
  controllers: [StudentAiController],
  providers: [StudentAiService],
})
export class StudentAiModule {}
