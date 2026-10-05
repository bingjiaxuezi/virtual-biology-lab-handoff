import { InMemoryEventLog } from '@virtual-biology-lab/experiment-events';
import { describe, expect, it } from 'vitest';
import { createExperimentRuntime } from '../src/index.js';
import { loadSampleDefinition } from './fixtures.js';

function setup() {
  const eventLog = new InMemoryEventLog();
  const runtime = createExperimentRuntime({ eventLog });
  const started = runtime.startRun({
    definition: loadSampleDefinition(),
    experimentVersionId: 'exp_enzyme_temperature@v1',
    studentId: 'stu_jump',
  });
  if (!started.ok) throw new Error('sample definition should start');
  return { eventLog, runtime, runId: started.run.runId };
}

/** 推进 start → set_temp（设 80°C）→ check_temp。 */
async function advanceToCheckTemp(runtime: ReturnType<typeof setup>['runtime'], runId: string) {
  await runtime.start(runId);
  await runtime.dispatch(runId, { type: 'ADVANCE' }); // → set_temp
  await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 80 });
  await runtime.dispatch(runId, { type: 'ADVANCE' }); // → check_temp
}

describe('JUMP_TO 读档跳转', () => {
  it('跳转到已访问节点：追加 JUMPED_TO，变量/分数不变', async () => {
    const { eventLog, runtime, runId } = setup();
    await advanceToCheckTemp(runtime, runId);
    const scoreBefore = runtime.getRun(runId)!.state.score;

    const jump = await runtime.dispatch(runId, { type: 'JUMP_TO', nodeId: 'start' });
    expect(jump.ok).toBe(true);
    const run = runtime.getRun(runId)!;
    expect(run.currentNodeId).toBe('start');
    expect(run.state.score).toBe(scoreBefore);
    expect(run.state.variables.temperature).toBe(80);

    const events = await eventLog.getByRun(runId);
    const jumped = events.find((e) => e.type === 'JUMPED_TO');
    expect(jumped?.payload).toMatchObject({ from: 'check_temp', to: 'start' });
  });

  it('跳转到未访问节点被拒绝且不产生事件', async () => {
    const { eventLog, runtime, runId } = setup();
    await advanceToCheckTemp(runtime, runId);
    const countBefore = (await eventLog.getByRun(runId)).length;

    const jump = await runtime.dispatch(runId, { type: 'JUMP_TO', nodeId: 'end' });
    expect(jump.ok).toBe(false);
    expect(runtime.getRun(runId)!.currentNodeId).toBe('check_temp');
    expect((await eventLog.getByRun(runId)).length).toBe(countBefore);
  });

  it('跳转到当前节点被拒绝', async () => {
    const { runtime, runId } = setup();
    await advanceToCheckTemp(runtime, runId);
    const jump = await runtime.dispatch(runId, { type: 'JUMP_TO', nodeId: 'check_temp' });
    expect(jump.ok).toBe(false);
  });

  it('已完成的 Run 拒绝跳转', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    await runtime.dispatch(runId, { type: 'ADVANCE' });
    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 37 });
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // check_temp
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // normal_media
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // observe
    await runtime.dispatch(runId, { type: 'SUBMIT_OBSERVATION', text: '观察到正常现象' });
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // end → COMPLETED
    expect(runtime.getRun(runId)!.status).toBe('COMPLETED');

    const jump = await runtime.dispatch(runId, { type: 'JUMP_TO', nodeId: 'start' });
    expect(jump.ok).toBe(false);
  });

  it('跳转后 BACK 以目标为栈顶继续回退', async () => {
    const { runtime, runId } = setup();
    await advanceToCheckTemp(runtime, runId); // start → set_temp → check_temp
    await runtime.dispatch(runId, { type: 'JUMP_TO', nodeId: 'set_temp' });
    expect(runtime.getRun(runId)!.currentNodeId).toBe('set_temp');

    // 访问栈被弹到 [start, set_temp]，BACK 应回到 start
    const back = await runtime.dispatch(runId, { type: 'BACK' });
    expect(back.ok).toBe(true);
    expect(runtime.getRun(runId)!.currentNodeId).toBe('start');
  });

  it('跳转后重走分支可再次前进', async () => {
    const { runtime, runId } = setup();
    await advanceToCheckTemp(runtime, runId);
    await runtime.dispatch(runId, { type: 'JUMP_TO', nodeId: 'set_temp' });
    // 改答案继续前进
    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 37 });
    await runtime.dispatch(runId, { type: 'ADVANCE' });
    expect(runtime.getRun(runId)!.currentNodeId).toBe('check_temp');
  });
});
