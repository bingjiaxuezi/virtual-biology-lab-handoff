import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { AIProvider, StructuredGenerationRequest, TextGenerationRequest } from './provider.js';

/**
 * Mock Provider：离线开发/测试默认。生成返回内置合法模板；
 * 修改对当前草稿做确定性规则化改写，绝不访问外网。
 */
export class MockProvider implements AIProvider {
  readonly id = 'mock';

  async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    const current = request.context?.currentDefinition;
    if (current && typeof current === 'object') {
      return this.applyInstruction(
        current as ExperimentDefinition,
        request.context?.instruction ?? request.userPrompt,
      );
    }
    return templateDefinition();
  }

  /** 规则化改写：识别少量指令模式，保证输出仍过三层校验。 */
  private applyInstruction(
    definition: ExperimentDefinition,
    instruction: string,
  ): ExperimentDefinition {
    let next = structuredClone(definition);

    // 「上限/最大 改为 N」→ 调整第一个 NUMBER 变量的 max
    const maxMatch = /(?:上限|最大)[^\d]*(\d+)/.exec(instruction);
    const numberVar = next.variables.find((v) => v.type === 'NUMBER');
    if (maxMatch && numberVar?.type === 'NUMBER') {
      const max = Number(maxMatch[1]);
      next = {
        ...next,
        variables: next.variables.map((v) =>
          v.id === numberVar.id && v.type === 'NUMBER'
            ? { ...v, max, defaultValue: Math.min(v.defaultValue, max) }
            : v,
        ),
      };
    }

    // 「增加/添加 … 提问/问题」→ 在 START 与其后继之间插入一个 QUESTION 节点
    if (/增加|添加|加入/.test(instruction) && /提问|问题/.test(instruction)) {
      const startNode = next.nodes.find((n) => n.type === 'START');
      const outEdge = next.transitions.find((t) => t.from === startNode?.id);
      if (startNode && outEdge) {
        const nodeId = `ai-question-${next.nodes.length}`;
        const question = {
          id: nodeId,
          type: 'QUESTION' as const,
          label: 'AI 添加的提问',
          config: { prompt: '你预测实验结果会怎样？为什么？' },
        };
        next = {
          ...next,
          nodes: [...next.nodes, question],
          transitions: [
            ...next.transitions.map((t) => (t.id === outEdge.id ? { ...t, to: nodeId } : t)),
            { id: `${outEdge.id}-q`, from: nodeId, to: outEdge.to },
          ],
        };
      }
    }

    return next;
  }

  /** 确定性中文文案：引用上下文关键信息，便于离线开发与测试断言。 */
  async generateText(request: TextGenerationRequest): Promise<string> {
    const ctx = request.context ?? { usage: 'unknown' };
    const vars = JSON.stringify(ctx.variables ?? {});
    switch (ctx.usage) {
      case 'briefing':
        return `【实验导读】${String(ctx.title ?? '本实验')}：你将通过调整变量、观察现象来探究其中的科学原理。建议先浏览实验步骤，预测不同变量取值下的结果，再动手验证。`;
      case 'hint':
        return `【提示（${String(ctx.hintLevel ?? 'STANDARD')}）】你正在「${String(ctx.currentNodeId ?? '')}」节点。当前状态 ${vars}。想一想：改变哪个变量可能带来不同的结果？可以先小步调整再观察。`;
      case 'observation-assist':
        return `【观察建议】你的记录提到「${String(ctx.draftText ?? '')}」。可以补充：现象发生的时间、程度（如气泡多少/颜色深浅）、与预期的对比，以及你的初步解释。`;
      case 'review':
        return `【实验复盘】本次实验得分 ${String(ctx.score ?? 0)}，共记录 ${String(ctx.eventCount ?? 0)} 个事件。回顾你的变量设置与观察记录：结果是否符合预期？如果重做，你会改变哪一步？`;
      default:
        return '【AI】这是一个 Mock 响应。';
    }
  }
}

/** 内置模板：保证通过三层 Validator（零 error）。 */
export function templateDefinition(): ExperimentDefinition {
  return {
    schemaVersion: '0.1',
    id: 'ai-template-experiment',
    version: 1,
    metadata: {
      title: 'AI 生成：变量对实验结果的影响',
      description: '由 AI Copilot（Mock）生成的模板实验，请在编辑器中按需调整。',
    },
    teaching: { objectives: ['理解单一变量对实验结果的影响'] },
    variables: [
      {
        id: 'temperature',
        name: '温度',
        type: 'NUMBER',
        defaultValue: 25,
        min: 0,
        max: 100,
        unit: '℃',
      },
      {
        id: 'result',
        name: '实验结果',
        type: 'ENUM',
        options: ['NORMAL', 'ABNORMAL'],
        defaultValue: 'NORMAL',
      },
    ],
    assets: [],
    nodes: [
      { id: 'start', type: 'START', label: '开始' },
      {
        id: 'set-temp',
        type: 'VARIABLE_INPUT',
        label: '设置温度',
        config: { variableId: 'temperature', inputMode: 'SLIDER' },
      },
      {
        id: 'check',
        type: 'CONDITION',
        label: '判断温度区间',
        config: { condition: { variableId: 'temperature', operator: 'GT', value: 60 } },
      },
      {
        id: 'observe',
        type: 'OBSERVATION',
        label: '记录现象',
        config: { prompt: '描述你观察到的实验现象' },
      },
      { id: 'end-normal', type: 'END', label: '正常完成', config: { outcome: 'NORMAL' } },
      { id: 'end-hot', type: 'END', label: '高温异常', config: { outcome: 'HOT' } },
    ],
    transitions: [
      { id: 't1', from: 'start', to: 'set-temp' },
      { id: 't2', from: 'set-temp', to: 'check' },
      {
        id: 't3',
        from: 'check',
        to: 'observe',
        condition: { variableId: 'temperature', operator: 'LTE', value: 60 },
        priority: 2,
      },
      {
        id: 't4',
        from: 'check',
        to: 'end-hot',
        condition: { variableId: 'temperature', operator: 'GT', value: 60 },
        priority: 1,
      },
      { id: 't5', from: 'observe', to: 'end-normal' },
    ],
    rules: [
      {
        id: 'r1',
        when: { variableId: 'temperature', operator: 'GT', value: 60 },
        effects: [
          { type: 'SET', variableId: 'result', value: 'ABNORMAL' },
          { type: 'SCORE', value: 10 },
        ],
      },
    ],
    assessment: {
      initialScore: 0,
      completion: { type: 'REACH_END' },
      summary: { showScore: true, showKeyEvents: true },
    },
    aiPolicy: {
      briefing: { enabled: false },
      tutor: {
        enabled: false,
        hintLevel: 'STANDARD',
        allowExplainTheory: true,
        allowPointOutWrongDirection: true,
        revealAnswer: false,
      },
      observationAssist: { enabled: false },
      review: { enabled: false },
    },
  };
}
