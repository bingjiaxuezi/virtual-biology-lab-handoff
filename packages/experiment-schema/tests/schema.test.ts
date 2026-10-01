import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  experimentDefinitionSchema,
  experimentNodeSchema,
  experimentVariableSchema,
  ruleEffectSchema,
} from '../src/index.js';
import { experimentDefinitionJsonSchema } from '../src/json-schema.js';

function loadSample(): unknown {
  return JSON.parse(
    readFileSync(
      new URL('../../../examples/enzyme-temperature.v0.1.json', import.meta.url),
      'utf-8',
    ),
  );
}

describe('experiment-definition schema', () => {
  it('parses the sample experiment', () => {
    const result = experimentDefinitionSchema.safeParse(loadSample());
    expect(result.success).toBe(true);
  });

  it('rejects a missing required top-level field', () => {
    const sample = loadSample() as Record<string, unknown>;
    delete sample.nodes;
    const result = experimentDefinitionSchema.safeParse(sample);
    expect(result.success).toBe(false);
  });

  it('rejects unknown variable type', () => {
    const result = experimentVariableSchema.safeParse({
      id: 'notes',
      name: '笔记',
      type: 'TEXT',
      defaultValue: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects GOTO-style flow effects in rules', () => {
    const result = ruleEffectSchema.safeParse({
      type: 'GOTO',
      targetNodeId: 'end',
    });
    expect(result.success).toBe(false);
  });

  it('rejects tutor.revealAnswer = true', () => {
    const sample = loadSample() as { aiPolicy: { tutor: { revealAnswer: boolean } } };
    sample.aiPolicy.tutor.revealAnswer = true;
    const result = experimentDefinitionSchema.safeParse(sample);
    expect(result.success).toBe(false);
  });

  it('rejects provider URLs in assets', () => {
    const sample = loadSample() as { assets: { assetId: string }[] };
    sample.assets[0]!.assetId = 'https://my-bucket.s3.amazonaws.com/video.mp4';
    const result = experimentDefinitionSchema.safeParse(sample);
    expect(result.success).toBe(false);
  });

  it('rejects unsupported node types', () => {
    const result = experimentNodeSchema.safeParse({
      id: 'sim',
      type: 'SIMULATION_3D',
    });
    expect(result.success).toBe(false);
  });

  it('parses all three variable kinds via discriminated union', () => {
    for (const variable of [
      { id: 'a', name: 'a', type: 'NUMBER', defaultValue: 0, min: 0, max: 1 },
      { id: 'b', name: 'b', type: 'ENUM', options: ['X'], defaultValue: 'X' },
      { id: 'c', name: 'c', type: 'BOOLEAN', defaultValue: false },
    ]) {
      expect(experimentVariableSchema.safeParse(variable).success).toBe(true);
    }
  });

  it('exports an equivalent JSON Schema', () => {
    const jsonSchema = experimentDefinitionJsonSchema();
    expect(jsonSchema).toBeTypeOf('object');
    expect(JSON.stringify(jsonSchema)).toContain('schemaVersion');
  });
});
