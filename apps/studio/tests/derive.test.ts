import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { describe, expect, it } from 'vitest';
import { conditionSummary, definitionToFlow } from '../src/editor/derive';

function loadSample(): ExperimentDefinition {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), '../../examples/enzyme-temperature.v0.1.json'), 'utf-8'),
  ) as ExperimentDefinition;
}

describe('definitionToFlow', () => {
  it('每个节点与每条 Transition 都映射为图元素，坐标不进入 Definition', () => {
    const definition = loadSample();
    const before = JSON.stringify(definition);

    const { nodes, edges } = definitionToFlow(definition);

    expect(nodes).toHaveLength(definition.nodes.length);
    expect(edges).toHaveLength(definition.transitions.length);
    // 自动布局给出了有限坐标
    for (const node of nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
    }
    // 投影过程不修改 Definition（坐标不落库）
    expect(JSON.stringify(definition)).toBe(before);
    expect(definition.nodes.every((n) => !('x' in n) && !('y' in n))).toBe(true);
  });

  it('带条件的 Transition 在连线上有摘要标签，无条件则没有', () => {
    const definition = loadSample();
    const { edges } = definitionToFlow(definition);
    const withCondition = edges.filter((e) => e.data?.transition.condition);
    expect(withCondition.length).toBeGreaterThan(0);
    for (const edge of withCondition) {
      expect(typeof edge.label).toBe('string');
      expect(String(edge.label)).toContain(edge.data!.transition.condition!.variableId);
    }
    const without = edges.filter((e) => !e.data?.transition.condition);
    for (const edge of without) {
      expect(edge.label).toBeUndefined();
    }
  });

  it('conditionSummary 输出可读的变量/操作符/值', () => {
    expect(conditionSummary({ variableId: 'temp', operator: 'GTE', value: 80 })).toBe(
      'temp GTE 80',
    );
    expect(conditionSummary(undefined)).toBe('');
  });
});
