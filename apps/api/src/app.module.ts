import { Module } from '@nestjs/common';
import { AssetsModule } from './assets/assets.module.js';
import { EventsModule } from './events/events.module.js';
import { ExperimentsModule } from './experiments/experiments.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RunsModule } from './runs/runs.module.js';

@Module({
  imports: [PrismaModule, HealthModule, AssetsModule, ExperimentsModule, RunsModule, EventsModule],
})
export class AppModule {}
