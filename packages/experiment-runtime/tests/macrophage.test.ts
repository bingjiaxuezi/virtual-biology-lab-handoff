import { readFileSync } from 'node:fs';
import { InMemoryEventLog } from '@virtual-biology-lab/experiment-events';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { describe, expect, it } from 'vitest';
import { createExperimentRuntime } from '../src/index.js';

function loadMacrophage(): ExperimentDefinition {
  return JSON.parse(
    readFileSync(
      new URL('../../../examples/macrophage-phagocytosis.v0.1.json', import.meta.url),
      'utf-8',
    ),
  ) as ExperimentDefinition;
}

const CORRECT: Record<string, string> = {
  grip_site: '颈后（头后侧）皮肤',
  dissect_tools: '剪刀和镊子',
  stain_amount: '适中一滴',
  coverslip_method: '染色适中后直接盖片',
  lens_choice: '先低倍镜再高倍镜',
  phagocytosed_cell: '被吞入巨噬细胞内的鸡红细胞',
  scene_choice: '荧光微球定量吞噬实验',
  keep_component: '细胞沉淀',
  pbs_site: '沿孔壁缓慢加入',
  keep_part: '细胞沉淀',
};

function setup() {
  const eventLog = new InMemoryEventLog();
  const runtime = createExperimentRuntime({ eventLog });
  const started = runtime.startRun({
    definition: loadMacrophage(),
    experimentVersionId: 'macrophage-phagocytosis@v1',
    studentId: 'stu_test',
  });
  if (!started.ok) throw new Error('macrophage definition should start');
  return { eventLog, runtime, runId: started.run.runId };
}

type Runtime = ReturnType<typeof createExperimentRuntime>;

/** 自动走流程：按当前节点类型派发命令，直到 COMPLETED 或达到步数上限。 */
async function walk(runtime: Runtime, runId: string, answers: Record<string, string>) {
  const definition = loadMacrophage();
  for (let step = 0; step < 300; step++) {
    const run = runtime.getRun(runId)!;
    if (run.status === 'COMPLETED') return;
    const node = definition.nodes.find((n) => n.id === run.currentNodeId)!;
    const advance = () => runtime.dispatch(runId, { type: 'ADVANCE' });
    switch (node.type) {
      case 'VARIABLE_INPUT': {
        const r = await runtime.dispatch(runId, {
          type: 'SET_VARIABLE',
          variableId: node.config.variableId,
          value: answers[node.config.variableId] ?? CORRECT[node.config.variableId]!,
        });
        if (!r.ok) throw new Error(`SET_VARIABLE failed at ${node.id}: ${r.reason}`);
        break;
      }
      case 'OBSERVATION':
        await runtime.dispatch(runId, { type: 'SUBMIT_OBSERVATION', text: '观察到吞噬现象' });
        break;
      case 'QUESTION':
        await runtime.dispatch(runId, {
          type: 'ANSWER_QUESTION',
          answer: node.config.options?.[0] ?? '回答',
        });
        break;
      case 'ACTION':
        await runtime.dispatch(runId, { type: 'PERFORM_ACTION' });
        break;
      default:
        break;
    }
    const adv = await advance();
    if (!adv.ok) throw new Error(`ADVANCE failed at ${node.id}: ${adv.reason}`);
  }
  throw new Error('walk exceeded 300 steps without completing');
}

describe('macrophage-phagocytosis 运行时', () => {
  it('全对路径：走到 END，满分 90', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    await walk(runtime, runId, {});
    const run = runtime.getRun(runId)!;
    expect(run.status).toBe('COMPLETED');
    expect(run.state.score).toBe(90);
  });

  it('全部选错路径：可走完，得分 0', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    const wrong: Record<string, string> = {
      grip_site: '背部皮肤',
      dissect_tools: '只选剪刀',
      stain_amount: '超大滴',
      coverslip_method: '先推片再盖玻片',
      lens_choice: '直接使用高倍镜',
      phagocytosed_cell: '细胞外游离的鸡红细胞',
      keep_component: '上清液',
      pbs_site: '直接滴加在细胞上',
      keep_part: '上清液',
    };
    // 判定题答错会被循环送回重答：walker 每次都按 wrong 回答会死循环，
    // 因此 phagocytosed_cell 在循环后改答正确（见下条专项测试），这里直接走完用正确答案。
    wrong.phagocytosed_cell = CORRECT.phagocytosed_cell!;
    await walk(runtime, runId, wrong);
    const run = runtime.getRun(runId)!;
    expect(run.status).toBe('COMPLETED');
    expect(run.state.score).toBe(10); // 仅判定题得分
  });

  it('判定题答错进入提醒视频并循环回选择点，改对后继续', async () => {
    const { runtime, runId } = setup();
    await runtime.start(runId);
    const definition = loadMacrophage();

    // 先走到判定题选择点：用全对答案走，但在 input_phago 前停下
    const visited: string[] = [];
    for (let step = 0; step < 300; step++) {
      const run = runtime.getRun(runId)!;
      const nodeId = run.currentNodeId;
      visited.push(nodeId);
      if (nodeId === 'input_phago') break;
      const node = definition.nodes.find((n) => n.id === nodeId)!;
      switch (node.type) {
        case 'VARIABLE_INPUT':
          await runtime.dispatch(runId, {
            type: 'SET_VARIABLE',
            variableId: node.config.variableId,
            value: CORRECT[node.config.variableId]!,
          });
          break;
        case 'OBSERVATION':
          await runtime.dispatch(runId, { type: 'SUBMIT_OBSERVATION', text: '观察' });
          break;
        case 'QUESTION':
          await runtime.dispatch(runId, { type: 'ANSWER_QUESTION', answer: '答' });
          break;
        case 'ACTION':
          await runtime.dispatch(runId, { type: 'PERFORM_ACTION' });
          break;
        default:
          break;
      }
      await runtime.dispatch(runId, { type: 'ADVANCE' });
    }

    // 答错 → 进入提醒视频
    await runtime.dispatch(runId, {
      type: 'SET_VARIABLE',
      variableId: 'phagocytosed_cell',
      value: '细胞外游离的鸡红细胞',
    });
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // → cond_phago
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // → media_scold
    expect(runtime.getRun(runId)!.currentNodeId).toBe('media_scold');
    expect(runtime.getRun(runId)!.state.score).toBe(50); // 前 5 个选择点得分，判定题未得分

    // 循环回选择点，改对后继续
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // → input_phago
    expect(runtime.getRun(runId)!.currentNodeId).toBe('input_phago');
    await runtime.dispatch(runId, {
      type: 'SET_VARIABLE',
      variableId: 'phagocytosed_cell',
      value: '被吞入巨噬细胞内的鸡红细胞',
    });
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // → cond_phago
    await runtime.dispatch(runId, { type: 'ADVANCE' }); // → obs_phago
    expect(runtime.getRun(runId)!.currentNodeId).toBe('obs_phago');
    expect(runtime.getRun(runId)!.state.score).toBe(60); // 判定题 +10，只计一次
  });
});
