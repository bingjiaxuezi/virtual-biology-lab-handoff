import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PrismaClient } from '@prisma/client';
import type { ExperimentEvent, RunState } from '@virtual-biology-lab/experiment-events';
import {
  type DispatchResult,
  type ExperimentRuntime,
  type RunSnapshot,
  type RunStatus,
  type RuntimeCommand,
  createExperimentRuntime,
} from '@virtual-biology-lab/experiment-runtime';
import { PrismaService } from '../prisma/prisma.service.js';
import { BufferedEventLog } from './buffered-event-log.js';

type RunRow = Prisma.ExperimentRunGetPayload<{ include: { experimentVersion: true } }>;

/**
 * 无状态运行编排：每个命令 = 读快照 → Runtime restore → 执行 → 事务落库。
 * 并发安全靠 Run 行 lastSequence 的乐观并发检查 + (runId, sequence) 唯一约束兜底。
 */
@Injectable()
export class RunsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(experimentVersionId: string, studentId: string) {
    const version = await this.prisma.experimentVersion.findUnique({
      where: { id: experimentVersionId },
    });
    if (!version) {
      throw new NotFoundException(`Experiment version "${experimentVersionId}" not found`);
    }

    // 发布时已全量校验，这里重建仅用于推导初始节点与初始状态
    const runtime = createExperimentRuntime({ eventLog: new BufferedEventLog(0) });
    const started = runtime.startRun({
      definition: version.definition,
      experimentVersionId: version.id,
      studentId,
    });
    if (!started.ok) {
      throw new InternalServerErrorException({
        message: 'Published definition failed to initialize a run',
        issues: started.issues,
      });
    }

    const row = await this.prisma.experimentRun.create({
      data: {
        experimentVersionId: version.id,
        studentId,
        status: 'CREATED',
        currentNodeId: started.run.currentNodeId,
        state: started.run.state as Prisma.InputJsonValue,
        lastSequence: 0,
      },
    });
    return this.toView(row);
  }

  async get(runId: string) {
    const row = await this.loadRun(runId);
    return this.toView(row);
  }

  start(runId: string) {
    return this.apply(runId, (runtime) => runtime.start(runId));
  }

  dispatch(runId: string, command: RuntimeCommand) {
    return this.apply(runId, (runtime) => runtime.dispatch(runId, command));
  }

  async abort(runId: string) {
    const row = await this.loadRun(runId);
    if (row.status === 'COMPLETED' || row.status === 'ABORTED') {
      throw new ConflictException(`Run "${runId}" is already ${row.status}`);
    }
    const updated = await this.prisma.experimentRun.update({
      where: { id: runId },
      data: { status: 'ABORTED' },
    });
    return this.toView(updated);
  }

  /**
   * 核心路径：快照恢复 → Runtime 执行 → 单事务落库事件与新快照。
   * 命令被拒绝时不写任何数据，保证零副作用。
   */
  private async apply(
    runId: string,
    action: (runtime: ExperimentRuntime) => Promise<DispatchResult>,
  ) {
    const row = await this.loadRun(runId);
    const eventLog = new BufferedEventLog(row.lastSequence);
    const runtime = createExperimentRuntime({ eventLog });

    const restored = runtime.restore(this.toSnapshot(row), row.experimentVersion.definition);
    if (!restored.ok) {
      throw new InternalServerErrorException({
        message: 'Run snapshot cannot be restored against its definition',
        issues: restored.issues,
      });
    }

    const result = await action(runtime);
    if (!result.ok) {
      return { ok: false as const, reason: result.reason, run: this.toView(row) };
    }

    const view = runtime.getRun(runId);
    if (!view) {
      throw new InternalServerErrorException(`Run "${runId}" disappeared after dispatch`);
    }
    const events = eventLog.drain();
    await this.commit(row, view, events);
    return { ok: true as const, events, run: view };
  }

  private async commit(
    row: RunRow,
    view: {
      status: RunStatus;
      currentNodeId: string;
      state: RunState;
      completedAt?: string;
    },
    events: ExperimentEvent[],
  ) {
    const newLastSequence = row.lastSequence + events.length;
    try {
      await this.prisma.$transaction(async (tx) => {
        // 乐观并发：只有快照未被其他请求推进过才允许更新
        const updated = await tx.experimentRun.updateMany({
          where: { id: row.id, lastSequence: row.lastSequence },
          data: {
            status: view.status,
            currentNodeId: view.currentNodeId,
            state: view.state as Prisma.InputJsonValue,
            lastSequence: newLastSequence,
            ...(view.completedAt !== undefined ? { completedAt: new Date(view.completedAt) } : {}),
          },
        });
        if (updated.count === 0) {
          throw new ConflictException(`Run "${row.id}" was modified concurrently, retry`);
        }
        if (events.length > 0) {
          await tx.experimentEvent.createMany({
            data: events.map((event) => ({
              id: event.eventId,
              runId: row.id,
              sequence: event.sequence,
              type: event.type,
              nodeId: event.nodeId ?? null,
              payload: event.payload as Prisma.InputJsonValue,
              stateBefore: (event.stateBefore ?? null) as Prisma.InputJsonValue,
              stateAfter: (event.stateAfter ?? null) as Prisma.InputJsonValue,
              timestamp: new Date(event.timestamp),
            })),
          });
        }
      });
    } catch (error) {
      // (runId, sequence) 唯一约束兜底：并发插入冲突视为并发修改
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(`Run "${row.id}" was modified concurrently, retry`);
      }
      throw error;
    }
  }

  private async loadRun(runId: string): Promise<RunRow> {
    const row = await this.prisma.experimentRun.findUnique({
      where: { id: runId },
      include: { experimentVersion: true },
    });
    if (!row) throw new NotFoundException(`Run "${runId}" not found`);
    return row;
  }

  private toSnapshot(row: RunRow): RunSnapshot {
    return {
      runId: row.id,
      experimentVersionId: row.experimentVersionId,
      studentId: row.studentId,
      status: row.status as RunStatus,
      currentNodeId: row.currentNodeId,
      state: row.state as unknown as RunState,
      lastSequence: row.lastSequence,
      startedAt: row.startedAt.toISOString(),
      ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {}),
    };
  }

  private toView(row: Prisma.ExperimentRunGetPayload<object>) {
    return {
      runId: row.id,
      experimentVersionId: row.experimentVersionId,
      studentId: row.studentId,
      status: row.status,
      currentNodeId: row.currentNodeId,
      state: row.state,
      lastSequence: row.lastSequence,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  }
}
