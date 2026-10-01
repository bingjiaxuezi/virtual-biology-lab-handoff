import { readFileSync } from 'node:fs';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';

export function loadSampleDefinition(): ExperimentDefinition {
  return JSON.parse(
    readFileSync(
      new URL('../../../examples/enzyme-temperature.v0.1.json', import.meta.url),
      'utf-8',
    ),
  ) as ExperimentDefinition;
}

/** 第二个合法 Definition：验证 Runtime 无任何实验硬编码。 */
export function buildLightDefinition(): Record<string, unknown> {
  return {
    schemaVersion: '0.1',
    id: 'exp_light_photosynthesis',
    version: 1,
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
    assets: [{ id: 'light_text', assetId: 'asset_light_text', type: 'TEXT' }],
    nodes: [
      { id: 'start', type: 'START' },
      {
        id: 'set_light',
        type: 'VARIABLE_INPUT',
        config: { variableId: 'light', inputMode: 'SLIDER' },
      },
      {
        id: 'show',
        type: 'MEDIA',
        config: { assetId: 'asset_light_text', mediaType: 'TEXT' },
      },
      {
        id: 'ask',
        type: 'QUESTION',
        config: { prompt: '光照越强，光合作用一定越快吗？' },
      },
      {
        id: 'pour',
        type: 'ACTION',
        config: { actionKind: '加入金鱼藻' },
      },
      { id: 'end', type: 'END' },
    ],
    transitions: [
      { id: 't1', from: 'start', to: 'set_light' },
      { id: 't2', from: 'set_light', to: 'show' },
      { id: 't3', from: 'show', to: 'ask' },
      { id: 't4', from: 'ask', to: 'pour' },
      { id: 't5', from: 'pour', to: 'end' },
    ],
    rules: [],
    assessment: {
      initialScore: 5,
      completion: { type: 'REACH_END' },
      summary: { showScore: true, showKeyEvents: true },
    },
    aiPolicy: {
      briefing: { enabled: false },
      tutor: {
        enabled: false,
        hintLevel: 'LIGHT',
        allowExplainTheory: false,
        allowPointOutWrongDirection: false,
        revealAnswer: false,
      },
      observationAssist: { enabled: false },
      review: { enabled: false },
    },
  };
}
