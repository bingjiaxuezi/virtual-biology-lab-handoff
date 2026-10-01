import { readFileSync } from 'node:fs';
import { createCapabilityRegistry } from '@virtual-biology-lab/capability-registry';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationCodes, validateExperiment } from '../src/index.js';

type SampleDefinition = {
  nodes: { id: string; type: string; config?: Record<string, unknown> }[];
  transitions: { id: string; from: string; to: string; condition?: Record<string, unknown> }[];
  variables: { id: string; type: string }[];
  rules: { when: Record<string, unknown>; effects: Record<string, unknown>[] }[];
  assets: unknown[];
};

function loadSample(): SampleDefinition {
  return JSON.parse(
    readFileSync(
      new URL('../../../examples/enzyme-temperature.v0.1.json', import.meta.url),
      'utf-8',
    ),
  ) as SampleDefinition;
}

function codesOf(result: ReturnType<typeof validateExperiment>): string[] {
  return result.issues.map((issue) => issue.code);
}

describe('validateExperiment', () => {
  it('1. valid sample experiment passes all three layers', () => {
    const result = validateExperiment(loadSample());
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('2. fails when START is missing', () => {
    const sample = loadSample();
    sample.nodes = sample.nodes.filter((node) => node.type !== 'START');
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.START_MISSING);
  });

  it('3. fails with duplicate START nodes', () => {
    const sample = loadSample();
    sample.nodes.push({ id: 'start_2', type: 'START' });
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.START_DUPLICATE);
  });

  it('4. fails when a transition targets a non-existent node', () => {
    const sample = loadSample();
    sample.transitions[0]!.to = 'ghost_node';
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.TRANSITION_TARGET_MISSING);
  });

  it('5. fails on undefined variable reference', () => {
    const sample = loadSample();
    sample.transitions[2]!.condition = { variableId: 'temperature2', operator: 'GT', value: 60 };
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.VARIABLE_REF_UNDEFINED);
  });

  it('6. NUMBER + GT is legal', () => {
    const sample = loadSample();
    // 样板中 t3 即 temperature(GT 60)，不应产生任何类型兼容错误
    const result = validateExperiment(sample);
    expect(codesOf(result)).not.toContain(ValidationCodes.CONDITION_TYPE_INCOMPATIBLE);
  });

  it('7. BOOLEAN + GT is illegal', () => {
    const sample = loadSample();
    sample.variables.push({
      id: 'flag',
      name: '标记',
      type: 'BOOLEAN',
      defaultValue: false,
    } as never);
    sample.transitions[2]!.condition = { variableId: 'flag', operator: 'GT', value: 1 };
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.CONDITION_TYPE_INCOMPATIBLE);
  });

  it('8. fails when Rule SET value type is incompatible', () => {
    const sample = loadSample();
    sample.rules[0]!.effects = [{ type: 'SET', variableId: 'temperature', value: 'hot' }];
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.EFFECT_TYPE_INCOMPATIBLE);
  });

  it('9a. unsupported node type literal fails structural validation', () => {
    const sample = loadSample() as unknown as Record<string, unknown>;
    (sample.nodes as unknown[]).push({ id: 'sim', type: 'SIMULATION_3D' });
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.SCHEMA_INVALID);
  });

  it('9b. node type missing from registry fails capability validation', () => {
    // 构造一个裁剪掉 MEDIA 能力的 Registry
    const trimmed = createCapabilityRegistry();
    trimmed.registerNodeCapability({
      type: 'MEDIA',
      version: '0.0.0-removed',
      description: 'placeholder',
      configSchema: z.object({}),
      aiAuthoringHint: 'removed',
    });
    const registry = {
      ...trimmed,
      hasNodeCapability: (type: string) => type !== 'MEDIA' && trimmed.hasNodeCapability(type),
    };
    const result = validateExperiment(loadSample(), registry);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.CAPABILITY_UNSUPPORTED);
  });

  it('10. fails when an END node is unreachable', () => {
    const sample = loadSample();
    sample.transitions = sample.transitions.filter((t) => t.id !== 't8');
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain(ValidationCodes.END_UNREACHABLE);
  });

  it('11. unreachable non-END node produces a warning, not an error', () => {
    const sample = loadSample();
    sample.nodes.push({
      id: 'orphan',
      type: 'ACTION',
      config: { actionKind: '孤立操作' },
    });
    const result = validateExperiment(sample);
    expect(result.valid).toBe(true);
    const orphan = result.issues.find((issue) => issue.code === ValidationCodes.NODE_UNREACHABLE);
    expect(orphan).toBeDefined();
    expect(orphan!.severity).toBe('warning');
  });

  it('12. every issue carries code/path/message/severity', () => {
    const sample = loadSample();
    sample.nodes = sample.nodes.filter((node) => node.type !== 'START');
    sample.transitions[0]!.to = 'ghost_node';
    const result = validateExperiment(sample);
    expect(result.issues.length).toBeGreaterThan(0);
    for (const issue of result.issues) {
      expect(issue.code).toBeTruthy();
      expect(issue.path).toBeTruthy();
      expect(issue.message).toBeTruthy();
      expect(['error', 'warning']).toContain(issue.severity);
    }
  });

  it('13. structural failure short-circuits semantic validation', () => {
    const sample = loadSample() as unknown as Record<string, unknown>;
    delete sample.nodes;
    const result = validateExperiment(sample);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(new Set(codesOf(result))).toEqual(new Set([ValidationCodes.SCHEMA_INVALID]));
  });
});
