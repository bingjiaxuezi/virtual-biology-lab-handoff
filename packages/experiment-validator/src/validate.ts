import { type CapabilityRegistry, defaultRegistry } from '@virtual-biology-lab/capability-registry';
import { validateCapabilities } from './capability.js';
import type { ValidationResult } from './errors.js';
import { validateSemantics } from './semantic.js';
import { validateStructural } from './structural.js';

/**
 * 三层校验管线：Structural → Semantic → Capability。
 * Structural 失败即短路；valid = 无任何 error 级问题（warning 不影响）。
 */
export function validateExperiment(
  input: unknown,
  registry: CapabilityRegistry = defaultRegistry,
): ValidationResult {
  const structural = validateStructural(input);
  if (!structural.definition) {
    return { valid: false, issues: structural.issues };
  }

  const issues = [
    ...structural.issues,
    ...validateSemantics(structural.definition),
    ...validateCapabilities(structural.definition, registry),
  ];

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
  };
}
