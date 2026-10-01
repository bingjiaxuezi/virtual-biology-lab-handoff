import { describe, expect, it } from 'vitest';
import { buildInitialState, evaluateCondition, evaluateRules } from '../src/index.js';
import { loadSampleDefinition } from './fixtures.js';

describe('evaluateCondition', () => {
  it('compares numbers with all six operators', () => {
    const variables = { temperature: 60 };
    expect(
      evaluateCondition({ variableId: 'temperature', operator: 'GT', value: 59 }, variables),
    ).toBe(true);
    expect(
      evaluateCondition({ variableId: 'temperature', operator: 'GT', value: 60 }, variables),
    ).toBe(false);
    expect(
      evaluateCondition({ variableId: 'temperature', operator: 'GTE', value: 60 }, variables),
    ).toBe(true);
    expect(
      evaluateCondition({ variableId: 'temperature', operator: 'LT', value: 61 }, variables),
    ).toBe(true);
    expect(
      evaluateCondition({ variableId: 'temperature', operator: 'LTE', value: 60 }, variables),
    ).toBe(true);
    expect(
      evaluateCondition({ variableId: 'temperature', operator: 'EQ', value: 60 }, variables),
    ).toBe(true);
    expect(
      evaluateCondition({ variableId: 'temperature', operator: 'NEQ', value: 60 }, variables),
    ).toBe(false);
  });

  it('is type-safe: BOOLEAN never passes relational comparison', () => {
    const definition = loadSampleDefinition();
    const variableDefs = new Map(definition.variables.map((v) => [v.id, v]));
    const variables = { sampleStatus: 'NORMAL' };
    expect(
      evaluateCondition(
        { variableId: 'sampleStatus', operator: 'GT', value: 'A' },
        variables,
        variableDefs,
      ),
    ).toBe(false);
    expect(
      evaluateCondition(
        { variableId: 'sampleStatus', operator: 'EQ', value: 'NORMAL' },
        variables,
        variableDefs,
      ),
    ).toBe(true);
  });

  it('returns false for unknown variables', () => {
    expect(evaluateCondition({ variableId: 'ghost', operator: 'EQ', value: 1 }, {})).toBe(false);
  });
});

describe('buildInitialState / evaluateRules', () => {
  it('builds initial state from defaults and initialScore', () => {
    const state = buildInitialState(loadSampleDefinition());
    expect(state).toEqual({
      variables: { temperature: 25, sampleStatus: 'NORMAL' },
      score: 0,
    });
  });

  it('applies the high-temperature rule at 80℃', () => {
    const definition = loadSampleDefinition();
    const { state, steps } = evaluateRules(definition, {
      variables: { temperature: 80, sampleStatus: 'NORMAL' },
      score: 0,
    });
    expect(steps.map((s) => s.rule.id)).toEqual(['r_high_temp']);
    expect(state.variables.sampleStatus).toBe('DENATURED');
    expect(state.score).toBe(10);
    expect(steps[0]!.variableChanges).toEqual([
      { variableId: 'sampleStatus', from: 'NORMAL', to: 'DENATURED' },
    ]);
  });

  it('applies the normal rule at 37℃', () => {
    const definition = loadSampleDefinition();
    const { state, steps } = evaluateRules(definition, {
      variables: { temperature: 37, sampleStatus: 'DENATURED' },
      score: 0,
    });
    expect(steps.map((s) => s.rule.id)).toEqual(['r_normal_temp']);
    expect(state.variables.sampleStatus).toBe('NORMAL');
    expect(state.score).toBe(20);
  });
});
