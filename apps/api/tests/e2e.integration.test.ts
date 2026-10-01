/**
 * 端到端验收（任务 5.1）：建草稿 → 发布 → 建 Run → 80℃ 高温路径 → 事件轨迹完整落库。
 * 需要 TEST_DATABASE_URL 指向真实 PostgreSQL，未设置时跳过。
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DATABASE_URL ? describe : describe.skip;

type PrismaClientType = import('@prisma/client').PrismaClient;

describeIf('phase3 e2e (integration)', () => {
  let prisma: PrismaClientType;
  let experiments: InstanceType<
    typeof import('../src/experiments/experiments.service.js').ExperimentsService
  >;
  let runs: InstanceType<typeof import('../src/runs/runs.service.js').RunsService>;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const { ExperimentsService } = await import('../src/experiments/experiments.service.js');
    const { RunsService } = await import('../src/runs/runs.service.js');
    prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL! });
    experiments = new ExperimentsService(prisma as never);
    runs = new RunsService(prisma as never);
  });

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
  });

  it('draft → publish → run → 80℃ path → complete persisted trail', async () => {
    const definition = JSON.parse(
      readFileSync(
        new URL('../../../examples/enzyme-temperature.v0.1.json', import.meta.url),
        'utf-8',
      ),
    ) as Record<string, unknown>;

    // 1. 草稿
    const { experiment } = (await experiments.create('酶温度 e2e', definition)) as {
      experiment: { id: string };
    };

    // 2. 发布
    const { version } = await experiments.publish(experiment.id);
    expect(version.version).toBe(1);

    // 发布后旧版本快照不可变：改草稿不影响已发布版本
    await experiments.update(experiment.id, { title: '酶温度 e2e v2' });
    const versions = await experiments.versions(experiment.id);
    expect(versions).toHaveLength(1);
    expect(versions[0]!.definition).toEqual(definition);

    // 3. 建 Run + 开始
    const run = await runs.create(version.id, 'stu_e2e');
    expect(run.status).toBe('CREATED');
    const started = await runs.start(run.runId);
    expect(started.ok).toBe(true);

    // 4. 80℃ 高温路径
    const mustOk = async <T extends { ok: boolean; reason?: string }>(promise: Promise<T>) => {
      const result = await promise;
      if (!result.ok) throw new Error(`dispatch failed: ${result.reason}`);
      return result;
    };
    await mustOk(runs.dispatch(run.runId, { type: 'ADVANCE' }));
    await mustOk(
      runs.dispatch(run.runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 80 }),
    );
    await mustOk(runs.dispatch(run.runId, { type: 'ADVANCE' })); // → check_temp
    const branch = await mustOk(runs.dispatch(run.runId, { type: 'ADVANCE' }));
    expect(branch.run.currentNodeId).toBe('denatured_media');
    await mustOk(runs.dispatch(run.runId, { type: 'ADVANCE' })); // → observe
    await mustOk(
      runs.dispatch(run.runId, { type: 'SUBMIT_OBSERVATION', text: '无气泡，酶已变性' }),
    );
    const finish = await mustOk(runs.dispatch(run.runId, { type: 'ADVANCE' }));
    expect(finish.run.status).toBe('COMPLETED');

    // 5. 轨迹完整落库：sequence 单调连续，含关键事件
    const events = await prisma.experimentEvent.findMany({
      where: { runId: run.runId },
      orderBy: { sequence: 'asc' },
    });
    expect(events.map((e) => e.sequence)).toEqual(events.map((_, i) => i + 1));
    const types = events.map((e) => e.type);
    for (const expected of [
      'RUN_STARTED',
      'VARIABLE_CHANGED',
      'RULE_APPLIED',
      'TRANSITION_TAKEN',
      'OBSERVATION_SUBMITTED',
      'RUN_COMPLETED',
    ]) {
      expect(types).toContain(expected);
    }

    // 快照行与事件流一致
    const finalRow = await prisma.experimentRun.findUnique({ where: { id: run.runId } });
    expect(finalRow!.status).toBe('COMPLETED');
    expect(finalRow!.lastSequence).toBe(events.length);
    expect(finalRow!.currentNodeId).toBe('end_denatured');
  });
});
