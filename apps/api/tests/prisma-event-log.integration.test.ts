/**
 * 集成测试：需要真实 PostgreSQL（默认 docker-compose 的库）。
 * 设置 TEST_DATABASE_URL 后运行；未设置时整组跳过，不影响无库环境下的单测。
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DATABASE_URL ? describe : describe.skip;

type PrismaClientType = import('@prisma/client').PrismaClient;

describeIf('PrismaEventLog (integration)', () => {
  let prisma: PrismaClientType;
  let runId: string;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaEventLog } = await import('../src/events/prisma-event-log.js');
    prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL! });

    const experiment = await prisma.experiment.create({
      data: { title: 'event-log-it', draft: {} },
    });
    const version = await prisma.experimentVersion.create({
      data: { experimentId: experiment.id, version: 1, definition: {} },
    });
    const run = await prisma.experimentRun.create({
      data: {
        experimentVersionId: version.id,
        studentId: 'stu_it',
        status: 'RUNNING',
        currentNodeId: 'start',
        state: {},
      },
    });
    runId = run.id;
    eventLog = new PrismaEventLog(prisma);
  });

  let eventLog: InstanceType<typeof import('../src/events/prisma-event-log.js').PrismaEventLog>;

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  function makeInput(type: string, sequence?: number) {
    return {
      runId,
      type: type as 'NODE_ENTERED',
      payload: { it: true },
      timestamp: new Date().toISOString(),
      ...(sequence !== undefined ? { sequence } : {}),
    };
  }

  it('appends events with database-assigned monotonic sequences', async () => {
    const e1 = await eventLog.append(makeInput('RUN_STARTED'));
    const e2 = await eventLog.append(makeInput('NODE_ENTERED'));
    expect(e1.sequence).toBe(1);
    expect(e2.sequence).toBe(2);
    expect(await eventLog.lastSequence(runId)).toBe(2);
  });

  it('rejects an explicit sequence that does not continue the stream', async () => {
    await expect(eventLog.append(makeInput('NODE_ENTERED', 99))).rejects.toThrow(
      /sequence conflict/i,
    );
    expect(await eventLog.lastSequence(runId)).toBe(2);
  });

  it('reads back the full ordered trail after a fresh connection (restart simulation)', async () => {
    const { PrismaClient } = await import('@prisma/client');
    const fresh = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL! });
    const { PrismaEventLog } = await import('../src/events/prisma-event-log.js');
    const freshLog = new PrismaEventLog(fresh);
    const trail = await freshLog.getByRun(runId);
    expect(trail.map((e) => e.sequence)).toEqual([1, 2]);
    expect(trail[0]!.type).toBe('RUN_STARTED');
    await fresh.$disconnect();
  });
});
