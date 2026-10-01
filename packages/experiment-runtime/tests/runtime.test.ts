import { InMemoryEventLog } from '@virtual-biology-lab/experiment-events';
import { describe, expect, it } from 'vitest';
import { type DispatchResult, type StartRunResult, createExperimentRuntime } from '../src/index.js';
import { buildLightDefinition, loadSampleDefinition } from './fixtures.js';

function okEvents(result: DispatchResult) {
  if (!result.ok) throw new Error(`dispatch failed: ${result.reason}`);
  return result.events;
}

function okRun(result: StartRunResult) {
  if (!result.ok) throw new Error('startRun failed');
  return result.run;
}

function setup() {
  const eventLog = new InMemoryEventLog();
  const runtime = createExperimentRuntime({ eventLog });
  return { eventLog, runtime };
}

function startSampleRun(runtime: ReturnType<typeof createExperimentRuntime>, studentId = 'stu_1') {
  const started = runtime.startRun({
    definition: loadSampleDefinition(),
    experimentVersionId: 'exp_enzyme_temperature@v1',
    studentId,
  });
  if (!started.ok) throw new Error('sample definition should be valid');
  return started.run;
}

describe('experiment-runtime e2e', () => {
  it('5.1 high-temperature path: 80℃ → DENATURED branch with complete event trail', async () => {
    const { eventLog, runtime } = setup();
    const run = startSampleRun(runtime);
    expect(run.status).toBe('CREATED');
    expect(run.state).toEqual({ variables: { temperature: 25, sampleStatus: 'NORMAL' }, score: 0 });

    const startedResult = await runtime.start(run.runId);
    expect(startedResult.ok).toBe(true);
    expect(okEvents(startedResult).map((e) => e.type)).toEqual(['RUN_STARTED', 'NODE_ENTERED']);
    expect(runtime.getRun(run.runId)!.status).toBe('RUNNING');

    // START 只是入口，需要显式 ADVANCE 到第一个交互节点
    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // start → set_temp
    // 越界赋值被拒绝且不产生事件
    const outOfRange = await runtime.dispatch(run.runId, {
      type: 'SET_VARIABLE',
      variableId: 'temperature',
      value: 120,
    });
    expect(outOfRange.ok).toBe(false);

    const setResult = await runtime.dispatch(run.runId, {
      type: 'SET_VARIABLE',
      variableId: 'temperature',
      value: 80,
    });
    expect(setResult.ok).toBe(true);
    expect(okEvents(setResult).map((e) => e.type)).toEqual([
      'VARIABLE_CHANGED',
      'RULE_APPLIED',
      'VARIABLE_CHANGED',
    ]);
    const afterSet = runtime.getRun(run.runId)!;
    expect(afterSet.state.variables.sampleStatus).toBe('DENATURED');
    expect(afterSet.state.score).toBe(10);

    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // → check_temp
    const branch = await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // → denatured_media
    expect(branch.ok).toBe(true);
    expect(okEvents(branch)[0]!.type).toBe('TRANSITION_TAKEN');
    expect(okEvents(branch)[0]!.payload.transitionId).toBe('t3');
    expect(runtime.getRun(run.runId)!.currentNodeId).toBe('denatured_media');

    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // → observe
    const observe = await runtime.dispatch(run.runId, {
      type: 'SUBMIT_OBSERVATION',
      text: '高温下没有气泡产生',
    });
    expect(observe.ok).toBe(true);
    expect(okEvents(observe)[0]!.type).toBe('OBSERVATION_SUBMITTED');

    const finish = await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // → end_denatured
    expect(finish.ok).toBe(true);
    const finalRun = runtime.getRun(run.runId)!;
    expect(finalRun.status).toBe('COMPLETED');
    expect(finalRun.currentNodeId).toBe('end_denatured');

    const trail = await eventLog.getByRun(run.runId);
    const types = trail.map((e) => e.type);
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
    expect(trail[trail.length - 1]!.payload.outcome).toBe('DENATURED');
    expect(trail.map((e) => e.sequence)).toEqual(trail.map((_, i) => i + 1));
  });

  it('5.2 normal path: 37℃ → NORMAL branch', async () => {
    const { runtime } = setup();
    const run = startSampleRun(runtime, 'stu_2');
    await runtime.start(run.runId);
    await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // start → set_temp
    await runtime.dispatch(run.runId, {
      type: 'SET_VARIABLE',
      variableId: 'temperature',
      value: 37,
    });
    expect(runtime.getRun(run.runId)!.state).toEqual({
      variables: { temperature: 37, sampleStatus: 'NORMAL' },
      score: 20,
    });
    await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // → check_temp
    const branch = await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // → normal_media
    expect(okEvents(branch)[0]!.payload.transitionId).toBe('t4');
    await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // → observe
    await runtime.dispatch(run.runId, { type: 'SUBMIT_OBSERVATION', text: '反应正常进行' });
    await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // → end_normal
    const finalRun = runtime.getRun(run.runId)!;
    expect(finalRun.status).toBe('COMPLETED');
    expect(finalRun.currentNodeId).toBe('end_normal');
  });

  it('5.3 the same runtime executes a different definition without code changes', async () => {
    const { runtime } = setup();
    const started = runtime.startRun({
      definition: buildLightDefinition(),
      experimentVersionId: 'exp_light_photosynthesis@v1',
      studentId: 'stu_3',
    });
    expect(started.ok).toBe(true);
    const run = okRun(started);
    expect(run.state).toEqual({ variables: { light: 50 }, score: 5 });

    await runtime.start(run.runId);
    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // start → set_light
    expect(
      (await runtime.dispatch(run.runId, { type: 'SET_VARIABLE', variableId: 'light', value: 80 }))
        .ok,
    ).toBe(true);
    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // → show
    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // → ask
    expect(
      (await runtime.dispatch(run.runId, { type: 'ANSWER_QUESTION', answer: '不一定' })).ok,
    ).toBe(true);
    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // → pour
    expect((await runtime.dispatch(run.runId, { type: 'PERFORM_ACTION' })).ok).toBe(true);
    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(true); // → end
    expect(runtime.getRun(run.runId)!.status).toBe('COMPLETED');
  });

  it('5.4 rejects invalid definitions and out-of-whitelist commands atomically', async () => {
    const { eventLog, runtime } = setup();
    const invalid = loadSampleDefinition() as unknown as Record<string, unknown>;
    invalid.nodes = (invalid.nodes as { type: string }[]).filter((n) => n.type !== 'START');
    const rejected = runtime.startRun({
      definition: invalid,
      experimentVersionId: 'bad@v1',
      studentId: 'stu_4',
    });
    expect(rejected.ok).toBe(false);
    expect(await eventLog.getByRun('nonexistent')).toEqual([]);

    const run = startSampleRun(runtime, 'stu_4');
    await runtime.start(run.runId);
    const eventsBefore = (await eventLog.getByRun(run.runId)).length;
    const stateBefore = runtime.getRun(run.runId)!.state;

    const unknownCommand = await runtime.dispatch(run.runId, {
      type: 'DELETE_RUN',
    } as unknown as Parameters<typeof runtime.dispatch>[1]);
    expect(unknownCommand.ok).toBe(false);

    const wrongNode = await runtime.dispatch(run.runId, { type: 'SUBMIT_OBSERVATION', text: 'x' });
    expect(wrongNode.ok).toBe(false);

    expect((await eventLog.getByRun(run.runId)).length).toBe(eventsBefore);
    expect(runtime.getRun(run.runId)!.state).toEqual(stateBefore);
  });

  it('5.5 snapshot restore continues identically', async () => {
    const { eventLog, runtime } = setup();
    const run = startSampleRun(runtime);
    await runtime.start(run.runId);
    await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // start → set_temp
    await runtime.dispatch(run.runId, {
      type: 'SET_VARIABLE',
      variableId: 'temperature',
      value: 80,
    });
    await runtime.dispatch(run.runId, { type: 'ADVANCE' }); // → check_temp

    const snap = (await runtime.snapshot(run.runId))!;
    expect(snap.currentNodeId).toBe('check_temp');
    expect(snap.lastSequence).toBe(await eventLog.lastSequence(run.runId));

    // 用同一个 Event Log 恢复到一个全新的 Runtime（模拟进程重启）
    const runtime2 = createExperimentRuntime({ eventLog });
    const restored = runtime2.restore(snap, loadSampleDefinition());
    expect(restored.ok).toBe(true);
    expect(okRun(restored).status).toBe('RUNNING');
    expect(okRun(restored).currentNodeId).toBe('check_temp');
    expect(okRun(restored).state.variables.temperature).toBe(80);

    const branch = await runtime2.dispatch(run.runId, { type: 'ADVANCE' });
    expect(branch.ok).toBe(true);
    expect(okEvents(branch)[0]!.payload.transitionId).toBe('t3');
    // sequence 与中断前衔接
    expect(okEvents(branch)[0]!.sequence).toBe(snap.lastSequence + 1);

    await runtime2.dispatch(run.runId, { type: 'ADVANCE' }); // → observe
    await runtime2.dispatch(run.runId, { type: 'SUBMIT_OBSERVATION', text: '恢复后继续' });
    await runtime2.dispatch(run.runId, { type: 'ADVANCE' }); // → end_denatured
    expect(runtime2.getRun(run.runId)!.status).toBe('COMPLETED');
    expect(runtime2.getRun(run.runId)!.currentNodeId).toBe('end_denatured');
  });

  it('5.6 AI events are recorded without changing run state', async () => {
    const { eventLog, runtime } = setup();
    const run = startSampleRun(runtime);
    await runtime.start(run.runId);
    const stateBefore = runtime.getRun(run.runId)!.state;
    const nodeBefore = runtime.getRun(run.runId)!.currentNodeId;

    const event = await runtime.recordAIEvent(run.runId, 'AI_HINT_SHOWN', { hint: '想想最适温度' });
    expect(event).toBeDefined();
    expect(runtime.getRun(run.runId)!.state).toEqual(stateBefore);
    expect(runtime.getRun(run.runId)!.currentNodeId).toBe(nodeBefore);
    expect((await eventLog.getByRun(run.runId)).map((e) => e.type)).toContain('AI_HINT_SHOWN');
  });

  it('run lifecycle: CREATED → RUNNING → COMPLETED, abort supported', async () => {
    const { runtime } = setup();
    const run = startSampleRun(runtime);
    expect(run.status).toBe('CREATED');
    await runtime.start(run.runId);
    expect(runtime.getRun(run.runId)!.status).toBe('RUNNING');
    runtime.abort(run.runId);
    expect(runtime.getRun(run.runId)!.status).toBe('ABORTED');
    expect((await runtime.dispatch(run.runId, { type: 'ADVANCE' })).ok).toBe(false);
  });
});
