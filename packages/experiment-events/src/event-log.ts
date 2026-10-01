import { randomUUID } from 'node:crypto';
import {
  type ExperimentEvent,
  type NewExperimentEvent,
  newExperimentEventSchema,
} from './event-types.js';

/**
 * Event Log：append-only 事实记录。
 * 不提供 update/delete；sequence 由 Log 分配（或校验调用方携带的 sequence 恰好为下一个）。
 */
export interface EventLog {
  append(input: NewExperimentEvent & { sequence?: number }): ExperimentEvent;
  getByRun(runId: string): ExperimentEvent[];
  lastSequence(runId: string): number;
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

  append(input: NewExperimentEvent & { sequence?: number }): ExperimentEvent {
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

  getByRun(runId: string): ExperimentEvent[] {
    return [...(this.eventsByRun.get(runId) ?? [])];
  }

  lastSequence(runId: string): number {
    return this.eventsByRun.get(runId)?.length ?? 0;
  }
}
