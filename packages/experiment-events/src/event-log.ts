/** 跨平台 UUID：浏览器/Node ≥19 都有 globalThis.crypto.randomUUID。 */
function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}
import {
  type ExperimentEvent,
  type NewExperimentEvent,
  newExperimentEventSchema,
} from './event-types.js';

/**
 * Event Log：append-only 事实记录。
 * 不提供 update/delete；sequence 由 Log 分配（或校验调用方携带的 sequence 恰好为下一个）。
 * 接口为异步，以便数据库等持久化实现与内存实现同构。
 */
export interface EventLog {
  append(input: NewExperimentEvent & { sequence?: number }): Promise<ExperimentEvent>;
  getByRun(runId: string): Promise<ExperimentEvent[]>;
  lastSequence(runId: string): Promise<number>;
}

export class SequenceConflictError extends Error {
  constructor(
    public readonly runId: string,
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(
      `Event sequence conflict for run "${runId}": expected next sequence ${expected}, got ${actual}`,
    );
    this.name = 'SequenceConflictError';
  }
}

export class InMemoryEventLog implements EventLog {
  private readonly eventsByRun = new Map<string, ExperimentEvent[]>();

  async append(input: NewExperimentEvent & { sequence?: number }): Promise<ExperimentEvent> {
    const parsed = newExperimentEventSchema.parse(input);
    const events = this.eventsByRun.get(input.runId) ?? [];
    const nextSequence = events.length + 1;
    if (input.sequence !== undefined && input.sequence !== nextSequence) {
      throw new SequenceConflictError(input.runId, nextSequence, input.sequence);
    }
    const event: ExperimentEvent = {
      ...parsed,
      eventId: randomUUID(),
      sequence: nextSequence,
    };
    events.push(event);
    this.eventsByRun.set(input.runId, events);
    return event;
  }

  async getByRun(runId: string): Promise<ExperimentEvent[]> {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }

  async lastSequence(runId: string): Promise<number> {
    return this.eventsByRun.get(runId)?.length ?? 0;
  }
}
