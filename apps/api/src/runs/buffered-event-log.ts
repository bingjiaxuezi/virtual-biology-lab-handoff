import { randomUUID } from 'node:crypto';
import type {
  EventLog,
  ExperimentEvent,
  NewExperimentEvent,
} from '@virtual-biology-lab/experiment-events';
import { SequenceConflictError } from '@virtual-biology-lab/experiment-events';

/**
 * 无状态 dispatch 的写入缓冲：Runtime 发出的事件先在内存中按序编号，
 * 由调用方在单个数据库事务里落库，保证「命令成功 = 事件+快照全部写入」的原子性。
 */
export class BufferedEventLog implements EventLog {
  private readonly buffered: ExperimentEvent[] = [];

  constructor(private readonly baseSequence: number) {}

  async append(input: NewExperimentEvent & { sequence?: number }): Promise<ExperimentEvent> {
    const nextSequence = this.baseSequence + this.buffered.length + 1;
    if (input.sequence !== undefined && input.sequence !== nextSequence) {
      throw new SequenceConflictError(input.runId, nextSequence, input.sequence);
    }
    const event: ExperimentEvent = {
      ...input,
      eventId: randomUUID(),
      sequence: nextSequence,
    };
    this.buffered.push(event);
    return event;
  }

  async getByRun(): Promise<ExperimentEvent[]> {
    return [...this.buffered];
  }

  async lastSequence(): Promise<number> {
    return this.baseSequence + this.buffered.length;
  }

  drain(): ExperimentEvent[] {
    return [...this.buffered];
  }
}
