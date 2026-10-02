import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';

/** 新建实验的最小合法骨架：START → END，零变量。 */
export function createBlankDefinition(title: string, id: string): ExperimentDefinition {
  return {
    schemaVersion: '0.1',
    id,
    version: 1,
    metadata: { title },
    teaching: { objectives: ['（待补充教学目标）'] },
    variables: [],
    assets: [],
    nodes: [
      { id: 'start', type: 'START', label: '开始' },
      { id: 'end', type: 'END', label: '结束', config: { outcome: '完成' } },
    ],
    transitions: [{ id: 't-start-end', from: 'start', to: 'end' }],
    rules: [],
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
