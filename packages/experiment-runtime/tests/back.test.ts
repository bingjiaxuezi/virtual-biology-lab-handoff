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
    studentId: 'stu_back',
  });
  if (!started.ok) throw new Error('sample definition should start');
  return { eventLog, runtime, runId: started.run.runId };
}

describe('BACK 回退命令', () => {
  it('正常回退到上一节点：变量/分数不变，追加 STEPPED_BACK', async () => {
    const { eventLog, runtime, runId } = setup();
    await runtime.start(runId);
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // start → set_temp
    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 80 });
    const scoreBefore = runtime.getRun(runId)!.state.score;

    const back = await runtime.dispatch(runId, { type: 'BACK' });
    expect(back.ok).toBe(true);
    const run = runtime.getRun(runId)!;
    expect(run.currentNodeId).toBe('start');
    expect(run.state.score).toBe(scoreBefore);
    expect(run.state.variables.temperature).toBe(80);

    const events = await eventLog.getByRun(runId);
    const stepped = events.find((e) => e.type === 'STEPPED_BACK');
    expect(stepped?.payload).toMatchObject({ from: 'set_temp', to: 'start' });
  });

  it('连续回退两级', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // → set_temp
    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 80 });
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // → check_temp
    expect(runtime.getRun(runId)!.currentNodeId).toBe('check_temp');

    await runtime.dispatch(runId, { type: 'BACK' }); // → set_temp
    expect(runtime.getRun(runId)!.currentNodeId).toBe('set_temp');
    await runtime.dispatch(runId, { type: 'BACK' }); // → start
    expect(runtime.getRun(runId)!.currentNodeId).toBe('start');
  });

  it('起点拒绝回退', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    const back = await runtime.dispatch(runId, { type: 'BACK' });
    expect(back.ok).toBe(false);
  });

  it('已完成的 Run 拒绝回退', async () => {
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

    const back = await runtime.dispatch(runId, { type: 'BACK' });
    expect(back.ok).toBe(false);
  });
});

describe('SCORE 幂等', () => {
  it('回退后重复提交正确答案不刷分', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    await runtime.dispatch(runId, { type: 'ADVANCE' });
    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 80 });
    expect(runtime.getRun(runId)!.state.score).toBe(10);

    // 回退再选一次同样答案：r_high_temp 的 SCORE 不再生效
    await runtime.dispatch(runId, { type: 'BACK' });
    await runtime.dispatch(runId, { type: 'ADVANCE' });
    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 80 });
    expect(runtime.getRun(runId)!.state.score).toBe(10);
  });

  it('酶温度回归：80→37 状态恢复且规则只计一次分', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    await runtime.dispatch(runId, { type: 'ADVANCE' });
    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 80 });
    expect(runtime.getRun(runId)!.state.variables.sampleStatus).toBe('DENATURED');
    expect(runtime.getRun(runId)!.state.score).toBe(10);

    await runtime.dispatch(runId, { type: 'SET_VARIABLE', variableId: 'temperature', value: 37 });
    const run = runtime.getRun(runId)!;
    expect(run.state.variables.sampleStatus).toBe('NORMAL'); // SET 效果照常重算
    expect(run.state.score).toBe(10 + 20); // 两条规则各计分一次
  });
});
