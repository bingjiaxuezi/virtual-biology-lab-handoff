import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));

import { readFileSync } from 'node:fs';
import { RunsService } from '../src/runs/runs.service.js';

function loadSampleDefinition() {
  return JSON.parse(
    readFileSync(
      new URL('../../../examples/enzyme-temperature.v0.1.json', import.meta.url),
      'utf-8',
    ),
  ) as Record<string, unknown>;
}

function makeRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'run1',
    experimentVersionId: 'ver1',
    studentId: 'stu_1',
    status: 'RUNNING',
    currentNodeId: 'check_temp',
    state: { variables: { temperature: 80, sampleStatus: 'DENATURED' }, score: 10 },
    lastSequence: 8,
    startedAt: new Date('2026-10-02T00:00:00Z'),
    completedAt: null,
    experimentVersion: {
      id: 'ver1',
      experimentId: 'exp1',
      version: 1,
      definition: loadSampleDefinition(),
    },
    ...overrides,
  };
}

function makePrisma() {
  const tx = {
    experimentRun: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    experimentEvent: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
  };
  return {
    tx,
    experimentVersion: { findUnique: vi.fn() },
    experimentRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    experimentEvent: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn().mockImplementation((fn: (t: unknown) => unknown) => fn(tx)),
  };
}

type MockPrisma = ReturnType<typeof makePrisma>;

describe('RunsService', () => {
  let prisma: MockPrisma;
  let service: RunsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new RunsService(prisma as never);
  });

  it('rejects creating a run for a version that was never published', async () => {
    prisma.experimentVersion.findUnique.mockResolvedValue(null);
    await expect(service.create('missing', 'stu_1')).rejects.toThrow(NotFoundException);
    expect(prisma.experimentRun.create).not.toHaveBeenCalled();
  });

  it('creates a CREATED run with initial state derived from the definition', async () => {
    prisma.experimentVersion.findUnique.mockResolvedValue({
      id: 'ver1',
      experimentId: 'exp1',
      version: 1,
      definition: loadSampleDefinition(),
    });
    prisma.experimentRun.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'run1', startedAt: new Date(), completedAt: null, ...data }),
    );

    const view = await service.create('ver1', 'stu_1');
    expect(view.status).toBe('CREATED');
    expect(view.currentNodeId).toBe('start');
    expect(view.state).toEqual({
      variables: { temperature: 25, sampleStatus: 'NORMAL' },
      score: 0,
    });
  });

  it('restores from snapshot and continues: check_temp at 80℃ branches to denatured path', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(makeRunRow());

    const result = await service.dispatch('run1', { type: 'ADVANCE' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.events[0]!.type).toBe('TRANSITION_TAKEN');
    expect(result.events[0]!.payload.transitionId).toBe('t3');
    expect(result.events[0]!.sequence).toBe(9);
    expect(result.run.currentNodeId).toBe('denatured_media');

    // 事件与新快照在同一事务内落库
    expect(prisma.tx.experimentRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run1', lastSequence: 8 },
        data: expect.objectContaining({ currentNodeId: 'denatured_media', lastSequence: 10 }),
      }),
    );
    const created = prisma.tx.experimentEvent.createMany.mock.calls[0]![0] as {
      data: { sequence: number; type: string }[];
    };
    expect(created.data.map((e) => e.sequence)).toEqual([9, 10]);
  });

  it('rejected commands write nothing: no transaction, no events', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(makeRunRow());

    const result = await service.dispatch('run1', { type: 'SUBMIT_OBSERVATION', text: 'x' });
    expect(result.ok).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('BACK steps back to the previous node using the historical event stream', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(makeRunRow());
    prisma.experimentEvent.findMany.mockResolvedValue(
      ['start', 'set_temp', 'check_temp'].map((nodeId, i) => ({
        id: `e${i}`,
        runId: 'run1',
        sequence: i + 1,
        type: 'NODE_ENTERED',
        nodeId,
        payload: {},
        stateBefore: null,
        stateAfter: null,
        timestamp: new Date('2026-10-02T00:00:00Z'),
      })),
    );

    const result = await service.dispatch('run1', { type: 'BACK' });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.events[0]!.type).toBe('STEPPED_BACK');
    expect(result.events[0]!.payload).toEqual({ from: 'check_temp', to: 'set_temp' });
    expect(result.run.currentNodeId).toBe('set_temp');
  });

  it('BACK on the start node is rejected without side effects', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(makeRunRow({ currentNodeId: 'start' }));
    prisma.experimentEvent.findMany.mockResolvedValue([
      {
        id: 'e1',
        runId: 'run1',
        sequence: 1,
        type: 'NODE_ENTERED',
        nodeId: 'start',
        payload: {},
        stateBefore: null,
        stateAfter: null,
        timestamp: new Date('2026-10-02T00:00:00Z'),
      },
    ]);

    const result = await service.dispatch('run1', { type: 'BACK' });
    expect(result.ok).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dispatching a COMPLETED run is rejected without side effects', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(
      makeRunRow({ status: 'COMPLETED', currentNodeId: 'end_denatured' }),
    );
    const result = await service.dispatch('run1', { type: 'ADVANCE' });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.reason).toContain('COMPLETED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('start emits RUN_STARTED + NODE_ENTERED and flips status to RUNNING', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(
      makeRunRow({
        status: 'CREATED',
        currentNodeId: 'start',
        state: { variables: { temperature: 25, sampleStatus: 'NORMAL' }, score: 0 },
        lastSequence: 0,
      }),
    );

    const result = await service.start('run1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.events.map((e) => e.type)).toEqual(['RUN_STARTED', 'NODE_ENTERED']);
    expect(result.events.map((e) => e.sequence)).toEqual([1, 2]);
    expect(prisma.tx.experimentRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RUNNING' }) }),
    );
  });

  it('optimistic concurrency conflict surfaces as 409 ConflictException', async () => {
    prisma.experimentRun.findUnique.mockResolvedValue(makeRunRow());
    prisma.tx.experimentRun.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.dispatch('run1', { type: 'ADVANCE' })).rejects.toThrow(ConflictException);
    expect(prisma.tx.experimentEvent.createMany).not.toHaveBeenCalled();
  });
});
