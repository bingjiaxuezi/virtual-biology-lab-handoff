import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));

import { readFileSync } from 'node:fs';
import { ExperimentsService } from '../src/experiments/experiments.service.js';

function loadSampleDefinition() {
  return JSON.parse(
    readFileSync(
      new URL('../../../examples/enzyme-temperature.v0.1.json', import.meta.url),
      'utf-8',
    ),
  ) as Record<string, unknown>;
}

function makePrisma() {
  return {
    experiment: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    experimentVersion: {
      findMany: vi.fn(),
    },
    experimentRun: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

type MockPrisma = ReturnType<typeof makePrisma>;

function makeService(prisma: MockPrisma) {
  return new ExperimentsService(prisma as never);
}

describe('ExperimentsService', () => {
  let prisma: MockPrisma;
  let service: ExperimentsService;

  beforeEach(() => {
    prisma = makePrisma();
    service = makeService(prisma);
  });

  it('saves a structurally valid draft and returns semantic warnings without blocking', async () => {
    // 缺 END 的草稿：结构可解析，语义层报错 → 保存成功但返回问题列表
    const broken = loadSampleDefinition();
    broken.nodes = (broken.nodes as { type: string }[]).filter((n) => n.type !== 'END');
    prisma.experiment.create.mockResolvedValue({ id: 'exp1', title: 'draft', draft: broken });

    const result = await service.create('draft', broken);
    expect(prisma.experiment.create).toHaveBeenCalledOnce();
    expect(result.warnings.some((w) => w.code === 'END_MISSING')).toBe(true);
  });

  it('rejects drafts that are not even structurally parseable', async () => {
    await expect(service.create('bad', { not: 'a definition' })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(prisma.experiment.create).not.toHaveBeenCalled();
  });

  it('publish passes full validation and assigns incremented version in a transaction', async () => {
    const draft = loadSampleDefinition();
    prisma.experiment.findUnique.mockResolvedValue({ id: 'exp1', title: '酶', draft });
    const tx = {
      experimentVersion: {
        findFirst: vi.fn().mockResolvedValue({ version: 2 }),
        create: vi.fn().mockResolvedValue({ id: 'ver3', version: 3 }),
      },
    };
    prisma.$transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

    const result = await service.publish('exp1');
    expect(tx.experimentVersion.create).toHaveBeenCalledWith({
      data: { experimentId: 'exp1', version: 3, definition: draft },
    });
    expect(result.version.version).toBe(3);
    expect(result.warnings).toEqual([]);
  });

  it('publish returns the full issue list when validation fails and writes nothing', async () => {
    const broken = loadSampleDefinition();
    broken.nodes = (broken.nodes as { type: string }[]).filter((n) => n.type !== 'END');
    prisma.experiment.findUnique.mockResolvedValue({ id: 'exp1', title: '酶', draft: broken });

    await expect(service.publish('exp1')).rejects.toThrow(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('first publish starts at version 1', async () => {
    const draft = loadSampleDefinition();
    prisma.experiment.findUnique.mockResolvedValue({ id: 'exp1', title: '酶', draft });
    const tx = {
      experimentVersion: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'ver1', version: 1 }),
      },
    };
    prisma.$transaction.mockImplementation((fn: (t: unknown) => unknown) => fn(tx));

    const result = await service.publish('exp1');
    expect(tx.experimentVersion.create).toHaveBeenCalledWith({
      data: { experimentId: 'exp1', version: 1, definition: draft },
    });
    expect(result.version.version).toBe(1);
  });

  it('listRuns returns summaries across versions ordered by startedAt desc', async () => {
    prisma.experiment.findUnique.mockResolvedValue({ id: 'exp1' });
    prisma.experimentRun.findMany.mockResolvedValue([
      {
        id: 'run2',
        studentId: 'stu_b',
        status: 'COMPLETED',
        state: { variables: {}, score: 10 },
        startedAt: new Date('2026-10-02T02:00:00Z'),
        completedAt: new Date('2026-10-02T02:05:00Z'),
        experimentVersion: { version: 2 },
      },
      {
        id: 'run1',
        studentId: 'stu_a',
        status: 'RUNNING',
        state: { variables: { temp: 37 }, score: 0 },
        startedAt: new Date('2026-10-02T01:00:00Z'),
        completedAt: null,
        experimentVersion: { version: 1 },
      },
    ]);

    const result = await service.listRuns('exp1');
    expect(prisma.experimentRun.findMany).toHaveBeenCalledWith({
      where: { experimentVersion: { experimentId: 'exp1' } },
      orderBy: { startedAt: 'desc' },
      include: { experimentVersion: { select: { version: true } } },
    });
    expect(result[0]).toMatchObject({ runId: 'run2', version: 2, score: 10 });
    expect(result[1]).toMatchObject({ runId: 'run1', version: 1, score: 0 });
  });

  it('listRuns throws 404 when the experiment does not exist', async () => {
    prisma.experiment.findUnique.mockResolvedValue(null);
    await expect(service.listRuns('missing')).rejects.toThrow(NotFoundException);
    expect(prisma.experimentRun.findMany).not.toHaveBeenCalled();
  });
});
