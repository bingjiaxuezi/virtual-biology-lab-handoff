import { describe, expect, it } from 'vitest';
import {
  EXPERIMENT_EVENT_TYPES,
  InMemoryEventLog,
  SequenceConflictError,
  experimentEventSchema,
} from '../src/index.js';

function makeEvent(runId: string, type: (typeof EXPERIMENT_EVENT_TYPES)[number]) {
  return {
    runId,
    type,
    payload: {},
    timestamp: new Date().toISOString(),
  };
}

describe('experiment-events', () => {
  it('supports all 14 core event types, serializable without loss', () => {
    expect(EXPERIMENT_EVENT_TYPES).toHaveLength(16);
    for (const type of EXPERIMENT_EVENT_TYPES) {
      const event = {
        eventId: 'e1',
        runId: 'r1',
        sequence: 1,
        type,
        payload: { foo: 'bar' },
        timestamp: new Date().toISOString(),
      };
      const parsed = experimentEventSchema.parse(JSON.parse(JSON.stringify(event)));
      expect(parsed).toEqual(event);
    }
  });

  it('rejects events missing required fields', () => {
    const result = experimentEventSchema.safeParse({
      eventId: 'e1',
      type: 'RUN_STARTED',
      payload: {},
      timestamp: 't',
    });
    expect(result.success).toBe(false);
  });

  it('Event Log exposes no update/delete interface (append-only)', () => {
    const log = new InMemoryEventLog();
    const api = Object.getOwnPropertyNames(Object.getPrototypeOf(log));
    expect(api).not.toContain('update');
    expect(api).not.toContain('delete');
    expect(api).not.toContain('remove');
  });

  it('assigns monotonically increasing sequences per run', async () => {
    const log = new InMemoryEventLog();
    const e1 = await log.append(makeEvent('r1', 'RUN_STARTED'));
    const e2 = await log.append(makeEvent('r1', 'NODE_ENTERED'));
    const e3 = await log.append(makeEvent('r1', 'VARIABLE_CHANGED'));
    expect([e1.sequence, e2.sequence, e3.sequence]).toEqual([1, 2, 3]);
    expect((await log.getByRun('r1')).map((e) => e.sequence)).toEqual([1, 2, 3]);
  });

  it('rejects explicit out-of-order or duplicate sequences', async () => {
    const log = new InMemoryEventLog();
    await log.append(makeEvent('r1', 'RUN_STARTED'));
    await log.append(makeEvent('r1', 'NODE_ENTERED'));
    await expect(
      log.append({ ...makeEvent('r1', 'VARIABLE_CHANGED'), sequence: 2 }),
    ).rejects.toThrow(SequenceConflictError);
    await expect(
      log.append({ ...makeEvent('r1', 'VARIABLE_CHANGED'), sequence: 5 }),
    ).rejects.toThrow(SequenceConflictError);
    // 显式携带正确的下一个 sequence 则允许
    expect(
      (await log.append({ ...makeEvent('r1', 'VARIABLE_CHANGED'), sequence: 3 })).sequence,
    ).toBe(3);
  });

  it('isolates event streams by runId', async () => {
    const log = new InMemoryEventLog();
    await log.append(makeEvent('r1', 'RUN_STARTED'));
    await log.append(makeEvent('r2', 'RUN_STARTED'));
    await log.append(makeEvent('r1', 'NODE_ENTERED'));
    await log.append(makeEvent('r2', 'RUN_COMPLETED'));
    expect((await log.getByRun('r1')).map((e) => e.type)).toEqual(['RUN_STARTED', 'NODE_ENTERED']);
    expect((await log.getByRun('r2')).map((e) => e.type)).toEqual(['RUN_STARTED', 'RUN_COMPLETED']);
    expect(await log.lastSequence('r1')).toBe(2);
    expect(await log.lastSequence('r2')).toBe(2);
  });
});
