/** 跨平台 UUID：优先 crypto.randomUUID（安全上下文/Node ≥19）；HTTP 非安全上下文回退 getRandomValues 拼 UUIDv4，最后 Math.random 兜底。 */
function randomUUID(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  if (typeof c?.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
    b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
    const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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
