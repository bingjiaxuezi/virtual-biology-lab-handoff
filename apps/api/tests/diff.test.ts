import { describe, expect, it } from 'vitest';
import { summarizeChange } from '../src/ai/diff.js';
import { templateDefinition } from '../src/ai/mock.provider.js';

describe('summarizeChange', () => {
  it('节点/变量/规则/连线的增删改计数与关键变化', () => {
    const before = templateDefinition();
    const after = templateDefinition();

    // 新增一个 QUESTION 节点 + 连线
    after.nodes.push({ id: 'q1', type: 'QUESTION', config: { prompt: '为何？' } });
    after.transitions.push({ id: 'tq', from: 'observe', to: 'q1' });
    // 删除一个规则
    after.rules = [];
    // 修改变量 max
    after.variables = after.variables.map((v) =>
      v.id === 'temperature' && v.type === 'NUMBER' ? { ...v, max: 120 } : v,
    );
    // 改标题
    after.metadata = { ...after.metadata, title: '新标题' };

    const summary = summarizeChange(before, after);

    expect(summary.some((l) => l.includes('标题'))).toBe(true);
    expect(summary.some((l) => l.includes('新增节点 q1（QUESTION）'))).toBe(true);
    expect(summary.some((l) => l.includes('修改变量 temperature'))).toBe(true);
    expect(summary.some((l) => l.includes('删除规则 r1'))).toBe(true);
    expect(summary.some((l) => l.includes('新增连线 1 条'))).toBe(true);
  });

  it('无变化时明确说明', () => {
    expect(summarizeChange(templateDefinition(), templateDefinition())).toEqual(['内容无实质变化']);
  });
});
