import { validateExperiment } from '@virtual-biology-lab/experiment-validator';
import { describe, expect, it } from 'vitest';
import { createBlankDefinition } from '../src/editor/blank';
import {
  addNode,
  addTransition,
  defaultNodeFor,
  removeNode,
  removeTransition,
  updateNode,
  updateTransition,
  upsertVariable,
} from '../src/editor/edits';

const blank = () => createBlankDefinition('测试实验', 'exp-test');

describe('blank definition', () => {
  it('最小骨架通过三层校验（无 error）', () => {
    const result = validateExperiment(blank());
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});

describe('node edits', () => {
  it('addNode 追加节点；重复 id 抛错', () => {
    const def = addNode(blank(), 'QUESTION', 'q1');
    expect(def.nodes.map((n) => n.id)).toContain('q1');
    expect(() => addNode(def, 'ACTION', 'q1')).toThrow(/已存在/);
  });

  it('updateNode 修改属性写回 Definition', () => {
    let def = addNode(blank(), 'QUESTION', 'q1');
    const node = def.nodes.find((n) => n.id === 'q1')!;
    def = updateNode(def, 'q1', { ...node, label: '题干改了' });
    expect(def.nodes.find((n) => n.id === 'q1')!.label).toBe('题干改了');
  });

  it('removeNode 级联删除出入连线', () => {
    let def = blank();
    def = addNode(def, 'ACTION', 'a1');
    def = removeTransition(def, 't-start-end');
    def = addTransition(def, 'start', 'a1', 't1');
    def = addTransition(def, 'a1', 'end', 't2');

    def = removeNode(def, 'a1');
    expect(def.nodes.map((n) => n.id)).not.toContain('a1');
    expect(def.transitions).toHaveLength(0);
  });
});

describe('transition edits', () => {
  it('addTransition 建线；重复 from→to 幂等', () => {
    let def = addNode(blank(), 'ACTION', 'a1');
    def = addTransition(def, 'start', 'a1', 't1');
    const again = addTransition(def, 'start', 'a1', 't-dup');
    expect(again.transitions).toHaveLength(def.transitions.length);
    expect(again.transitions.every((t) => t.id !== 't-dup')).toBe(true);
  });

  it('updateTransition 设置条件与优先级', () => {
    let def = addNode(blank(), 'ACTION', 'a1');
    def = addTransition(def, 'start', 'a1', 't1');
    def = upsertVariable(def, {
      id: 'temp',
      name: '温度',
      type: 'NUMBER',
      defaultValue: 37,
      min: 0,
      max: 100,
      unit: '℃',
    });
    def = updateTransition(def, 't1', {
      condition: { variableId: 'temp', operator: 'GTE', value: 80 },
      priority: 1,
    });
    const t = def.transitions.find((x) => x.id === 't1')!;
    expect(t.condition).toEqual({ variableId: 'temp', operator: 'GTE', value: 80 });
    expect(t.priority).toBe(1);
  });
});

describe('defaultNodeFor', () => {
  it('八种类型都有合法默认配置', () => {
    for (const type of [
      'START',
      'ACTION',
      'VARIABLE_INPUT',
      'MEDIA',
      'OBSERVATION',
      'QUESTION',
      'CONDITION',
      'END',
    ] as const) {
      const node = defaultNodeFor(type, `n-${type}`);
      expect(node.type).toBe(type);
      expect(node.id).toBe(`n-${type}`);
    }
  });
});
