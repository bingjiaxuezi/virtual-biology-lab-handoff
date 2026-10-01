import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type {
  EventLog,
  ExperimentEvent,
  NewExperimentEvent,
} from '@virtual-biology-lab/experiment-events';
import { SequenceConflictError } from '@virtual-biology-lab/experiment-events';

type DbClient = PrismaClient;

/**
 * EventLog 的 PostgreSQL 实现：append-only，sequence 在事务内取 MAX+1 分配，
 * (runId, sequence) 唯一约束作为并发最终防线，冲突即回滚并抛出 SequenceConflictError。
 */
export class PrismaEventLog implements EventLog {
  constructor(private readonly db: DbClient) {}

  async append(input: NewExperimentEvent & { sequence?: number }): Promise<ExperimentEvent> {
    try {
      return await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
        const latest = await tx.experimentEvent.aggregate({
          where: { runId: input.runId },
          _max: { sequence: true },
        });
        const nextSequence = (latest._max.sequence ?? 0) + 1;
        if (input.sequence !== undefined && input.sequence !== nextSequence) {
          throw new SequenceConflictError(input.runId, nextSequence, input.sequence);
        }
        const row = await tx.experimentEvent.create({
          data: {
            runId: input.runId,
            sequence: nextSequence,
            type: input.type,
            nodeId: input.nodeId ?? null,
            payload: input.payload as Prisma.InputJsonValue,
            stateBefore: (input.stateBefore ?? null) as Prisma.InputJsonValue,
            stateAfter: (input.stateAfter ?? null) as Prisma.InputJsonValue,
            timestamp: new Date(input.timestamp),
          },
        });
        return this.toEvent(row);
      });
    } catch (error) {
      if (error instanceof SequenceConflictError) throw error;
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new SequenceConflictError(input.runId, -1, input.sequence ?? -1);
      }
      throw error;
    }
  }

  async getByRun(runId: string): Promise<ExperimentEvent[]> {
    const rows = await this.db.experimentEvent.findMany({
      where: { runId },
      orderBy: { sequence: 'asc' },
    });
    return rows.map((row) => this.toEvent(row));
  }

  async lastSequence(runId: string): Promise<number> {
    const latest = await this.db.experimentEvent.aggregate({
      where: { runId },
      _max: { sequence: true },
    });
    return latest._max.sequence ?? 0;
  }

  private toEvent(row: Prisma.ExperimentEventGetPayload<object>): ExperimentEvent {
    return {
      eventId: row.id,
      runId: row.runId,
      sequence: row.sequence,
      type: row.type as ExperimentEvent['type'],
      payload: row.payload as Record<string, unknown>,
      timestamp: row.timestamp.toISOString(),
      ...(row.nodeId !== null ? { nodeId: row.nodeId } : {}),
      ...(row.stateBefore !== null
        ? { stateBefore: row.stateBefore as ExperimentEvent['stateBefore'] }
        : {}),
      ...(row.stateAfter !== null
        ? { stateAfter: row.stateAfter as ExperimentEvent['stateAfter'] }
        : {}),
    };
  }
}
