/**
 * Student AI 集成测试（真实 PostgreSQL）：命令事件与 AI 事件混合序列单调，
 * 教师轨迹可见 AI 事件，AI 调用不改变运行状态。需要 TEST_DATABASE_URL。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeIf = TEST_DATABASE_URL ? describe : describe.skip;

type PrismaClientType = import('@prisma/client').PrismaClient;

describeIf('student-ai (integration)', () => {
  let prisma: PrismaClientType;
  let runId: string;
  let studentAi: InstanceType<
    typeof import('../src/student-ai/student-ai.service.js').StudentAiService
  >;
  let runs: InstanceType<typeof import('../src/runs/runs.service.js').RunsService>;

  beforeAll(async () => {
    const { PrismaClient } = await import('@prisma/client');
    const { ExperimentsService } = await import('../src/experiments/experiments.service.js');
    const { RunsService } = await import('../src/runs/runs.service.js');
    const { StudentAiService } = await import('../src/student-ai/student-ai.service.js');
    const { MockProvider } = await import('../src/ai/mock.provider.js');

    prisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL! });
    const experiments = new ExperimentsService(prisma as never);
    runs = new RunsService(prisma as never);
    studentAi = new StudentAiService(prisma as never, new MockProvider());

    // 发布一份 AI 功能全开的实验
    const definition = JSON.parse(
      readFileSync(resolve(process.cwd(), '../../examples/enzyme-temperature.v0.1.json'), 'utf-8'),
    ) as Record<string, unknown>;
    definition.id = `exp_ai_it_${Date.now()}`;
    const aiPolicy = definition.aiPolicy as {
      briefing: { enabled: boolean };
      tutor: { enabled: boolean };
      observationAssist: { enabled: boolean };
      review: { enabled: boolean };
    };
    aiPolicy.briefing.enabled = true;
    aiPolicy.tutor.enabled = true;
    aiPolicy.observationAssist.enabled = true;
    aiPolicy.review.enabled = true;

    const { experiment } = (await experiments.create('AI 集成实验', definition)) as {
      experiment: { id: string };
    };
    const { version } = await experiments.publish(experiment.id);
    const run = await runs.create(version.id, `stu_ai_it_${Date.now()}`);
    runId = run.runId;
    await runs.start(runId);
  });

  afterAll(async () => {
    await prisma.experimentEvent.deleteMany({ where: { runId } });
    await prisma.experimentRun.deleteMany({ where: { id: runId } });
    await prisma.$disconnect();
  });

  it('AI 事件与学生命令事件混合序列严格单调，AI 不改变运行状态', async () => {
    // 学生先走一步命令
    const step1 = await runs.dispatch(runId, { type: 'ADVANCE' });
    expect(step1.ok).toBe(true);
    const beforeAi = await runs.get(runId);

    // AI：导读 + 提示
    const briefing = await studentAi.briefing(runId);
    expect(briefing.text).toContain('实验导读');
    const hint = await studentAi.hint(runId);
    expect(hint.text).toContain('提示');

    // 运行状态字段与 AI 调用前一致
    const afterAi = await runs.get(runId);
    expect(afterAi.status).toBe(beforeAi.status);
    expect(afterAi.currentNodeId).toBe(beforeAi.currentNodeId);
    expect(afterAi.state).toEqual(beforeAi.state);

    // 事件流：sequence 严格单调、包含 AI 事件
    const events = await prisma.experimentEvent.findMany({
      where: { runId },
      orderBy: { sequence: 'asc' },
    });
    const sequences = events.map((e) => e.sequence);
    expect(sequences).toEqual(Array.from({ length: sequences.length }, (_, i) => i + 1));
    const types = events.map((e) => e.type);
    expect(types).toContain('AI_BRIEFING_VIEWED');
    expect(types).toContain('AI_HINT_REQUESTED');
    expect(types).toContain('AI_HINT_SHOWN');

    // 学生命令继续，sequence 衔接在 AI 事件之后
    const step2 = await runs.dispatch(runId, {
      type: 'SET_VARIABLE',
      variableId: 'temperature',
      value: 80,
    });
    expect(step2.ok).toBe(true);
    const after = await prisma.experimentEvent.findMany({
      where: { runId },
      orderBy: { sequence: 'asc' },
      select: { sequence: true },
    });
    expect(after.map((e) => e.sequence)).toEqual(
      Array.from({ length: after.length }, (_, i) => i + 1),
    );

    // RUNNING 状态复盘被拒
    await expect(studentAi.review(runId)).rejects.toMatchObject({
      response: { code: 'AI_REVIEW_NOT_READY' },
    });
  });
});
