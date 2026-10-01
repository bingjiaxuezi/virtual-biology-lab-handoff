import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';

/** vitest 以 apps/web 为 cwd 运行，向上两级到仓库根。 */
export function loadSampleDefinition(): ExperimentDefinition {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), '../../examples/enzyme-temperature.v0.1.json'), 'utf-8'),
  ) as ExperimentDefinition;
}

/** 覆盖样例中没有的 ACTION / QUESTION 节点。 */
export const lightDefinition = {
  metadata: { title: '光照对光合作用的影响' },
  teaching: { objectives: ['理解光照强度与光合作用速率的关系'] },
  variables: [
    {
      id: 'light',
      name: '光照强度',
      type: 'NUMBER',
      defaultValue: 50,
      min: 0,
      max: 100,
      unit: 'lx',
    },
  ],
  assets: [],
  nodes: [
    { id: 'pour', type: 'ACTION', config: { actionKind: '加入金鱼藻' } },
    { id: 'ask', type: 'QUESTION', config: { prompt: '光照越强，光合作用一定越快吗？' } },
  ],
} as unknown as ExperimentDefinition;
