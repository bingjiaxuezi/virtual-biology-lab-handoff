import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createCapabilityRegistry, defaultRegistry } from '../src/index.js';

describe('capability-registry', () => {
  it('registers exactly the 8 Iteration 1 node types', () => {
    const types = defaultRegistry.listNodeCapabilities().map((c) => c.type);
    expect(types.sort()).toEqual(
      [
        'START',
        'ACTION',
        'VARIABLE_INPUT',
        'MEDIA',
        'OBSERVATION',
        'QUESTION',
        'CONDITION',
        'END',
      ].sort(),
    );
  });

  it('every node capability has complete metadata', () => {
    for (const capability of defaultRegistry.listNodeCapabilities()) {
      expect(capability.version).toBeTruthy();
      expect(capability.description).toBeTruthy();
      expect(capability.aiAuthoringHint).toBeTruthy();
      expect(capability.configSchema).toBeDefined();
      expect(typeof capability.configSchema.safeParse).toBe('function');
    }
  });

  it('VARIABLE_INPUT config schema validates variableId/inputMode', () => {
    const capability = defaultRegistry.getNodeCapability('VARIABLE_INPUT');
    expect(capability).toBeDefined();
    expect(
      capability!.configSchema.safeParse({ variableId: 'temperature', inputMode: 'SLIDER' })
        .success,
    ).toBe(true);
    expect(capability!.configSchema.safeParse({ variableId: 'temperature' }).success).toBe(false);
  });

  it('returns undefined for unknown capability instead of inventing one', () => {
    expect(defaultRegistry.hasNodeCapability('SIMULATION_3D')).toBe(false);
    expect(defaultRegistry.hasEffect('TELEPORT')).toBe(false);
    expect(defaultRegistry.hasOperator('CONTAINS')).toBe(false);
  });

  it('registers variable/operator/effect/media capabilities', () => {
    expect(
      defaultRegistry
        .listVariableCapabilities()
        .map((c) => c.type)
        .sort(),
    ).toEqual(['BOOLEAN', 'ENUM', 'NUMBER']);
    expect(defaultRegistry.listOperatorCapabilities()).toHaveLength(6);
    expect(defaultRegistry.listEffectCapabilities()).toHaveLength(4);
    expect(
      defaultRegistry
        .listMediaCapabilities()
        .map((c) => c.type)
        .sort(),
    ).toEqual(['IMAGE', 'TEXT', 'VIDEO']);
  });

  it('operator capabilities declare compatible variable types', () => {
    expect(defaultRegistry.getOperatorCapability('GT')!.compatibleVariableTypes).toEqual([
      'NUMBER',
    ]);
    expect(defaultRegistry.getOperatorCapability('EQ')!.compatibleVariableTypes).toEqual([
      'NUMBER',
      'ENUM',
      'BOOLEAN',
    ]);
  });

  it('registering a new capability does not change existing entries', () => {
    const registry = createCapabilityRegistry();
    const mediaBefore = registry.getNodeCapability('MEDIA');
    registry.registerNodeCapability({
      type: 'ACTION',
      version: '9.9.9-custom',
      description: '定制 ACTION',
      configSchema: z.object({}),
      aiAuthoringHint: 'custom',
    });
    // 覆盖同类型是显式升级；其它条目的内容与版本不受影响
    expect(registry.getNodeCapability('MEDIA')).toBe(mediaBefore);
    expect(registry.getNodeCapability('MEDIA')?.version).toBe(
      defaultRegistry.getNodeCapability('MEDIA')?.version,
    );
    expect(registry.getNodeCapability('ACTION')?.version).toBe('9.9.9-custom');
  });
});
