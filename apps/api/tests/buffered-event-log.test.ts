import { SequenceConflictError } from '@virtual-biology-lab/experiment-events';
import { describe, expect, it } from 'vitest';
import { BufferedEventLog } from '../src/runs/buffered-event-log.js';

function makeInput(sequence?: number) {
  return {
    runId: 'r1',
    type: 'NODE_ENTERED' as const,
    payload: {},
    timestamp: new Date().toISOString(),
    ...(sequence !== undefined ? { sequence } : {}),
  };
}

describe('BufferedEventLog', () => {
  it('assigns sequences continuing from the base sequence', async () => {
    const log = new BufferedEventLog(5);
    const e1 = await log.append(makeInput());
    const e2 = await log.append(makeInput());
    expect([e1.sequence, e2.sequence]).toEqual([6, 7]);
    expect(await log.lastSequence()).toBe(7);
  });

  it('rejects explicit sequences that do not continue the buffer', async () => {
    const log = new BufferedEventLog(0);
    await expect(log.append(makeInput(3))).rejects.toThrow(SequenceConflictError);
    await log.append(makeInput(1));
    await expect(log.append(makeInput(1))).rejects.toThrow(SequenceConflictError);
    expect((await log.append(makeInput(2))).sequence).toBe(2);
  });

  it('drains buffered events without persisting anything', async () => {
    const log = new BufferedEventLog(10);
    await log.append(makeInput());
    const drained = log.drain();
    expect(drained).toHaveLength(1);
    expect(drained[0]!.sequence).toBe(11);
    expect(drained[0]!.eventId).toBeTruthy();
  });
});
