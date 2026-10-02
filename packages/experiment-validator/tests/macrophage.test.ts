import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { validateExperiment } from '../src/index.js';

function loadMacrophage(): unknown {
  return JSON.parse(
    readFileSync(
      new URL('../../../examples/macrophage-phagocytosis.v0.1.json', import.meta.url),
      'utf-8',
    ),
  );
}

describe('macrophage-phagocytosis 示例实验', () => {
  it('通过校验：零 error', () => {
    const result = validateExperiment(loadMacrophage() as never);
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
  });
});
