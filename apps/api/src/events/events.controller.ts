import { Controller, Get, Inject, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaEventLog } from './prisma-event-log.js';

@Controller('runs')
export class EventsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** 按 sequence 升序返回一次运行的完整事件轨迹。 */
  @Public()
  @Get(':runId/events')
  getByRun(@Param('runId') runId: string) {
    return new PrismaEventLog(this.prisma).getByRun(runId);
  }
}
