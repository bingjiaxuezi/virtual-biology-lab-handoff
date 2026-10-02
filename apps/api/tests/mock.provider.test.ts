import { validateExperiment } from '@virtual-biology-lab/experiment-validator';
import { describe, expect, it } from 'vitest';
import { MockProvider, templateDefinition } from '../src/ai/mock.provider.js';

describe('MockProvider', () => {
  it('内置模板通过三层校验（零 error）', () => {
    const result = validateExperiment(templateDefinition());
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('generate：无 context 时返回合法模板，绝不访问外网', async () => {
    const provider = new MockProvider();
    const output = await provider.generateStructured({
      systemPrompt: 's',
      userPrompt: '生成一个光合作用实验',
    });
    const result = validateExperiment(output);
    expect(result.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('change：识别「上限」指令并调整 NUMBER 变量 max', async () => {
    const provider = new MockProvider();
    const output = (await provider.generateStructured({
      systemPrompt: 's',
      userPrompt: '把温度上限改为 120',
      context: { currentDefinition: templateDefinition(), instruction: '把温度上限改为 120' },
    })) as ReturnType<typeof templateDefinition>;

    const temp = output.variables.find((v) => v.id === 'temperature');
    expect(temp?.type === 'NUMBER' && temp.max).toBe(120);
    expect(validateExperiment(output).issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('change：识别「增加提问」指令并在 START 后插入 QUESTION 节点', async () => {
    const provider = new MockProvider();
    const output = (await provider.generateStructured({
      systemPrompt: 's',
      userPrompt: '增加一个提问节点',
      context: { currentDefinition: templateDefinition(), instruction: '增加一个提问节点' },
    })) as ReturnType<typeof templateDefinition>;

    const question = output.nodes.find((n) => n.type === 'QUESTION');
    expect(question).toBeDefined();
    // START 的后继被重定向到提问节点，提问节点连向原后继
    expect(output.transitions.some((t) => t.from === 'start' && t.to === question!.id)).toBe(true);
    expect(validateExperiment(output).issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});
