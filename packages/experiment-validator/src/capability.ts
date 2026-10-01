import type { CapabilityRegistry } from '@virtual-biology-lab/capability-registry';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { ValidationCodes, type ValidationIssue, error } from './errors.js';

/**
 * Capability Validator：Definition 用到的所有类型必须存在于当前 Registry。
 * 结构校验已保证类型字面值合法，这里防御的是 Registry 裁剪能力后的情况。
 */
export function validateCapabilities(
  definition: ExperimentDefinition,
  registry: CapabilityRegistry,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  definition.nodes.forEach((node, index) => {
    if (!registry.hasNodeCapability(node.type)) {
      issues.push(
        error(
          ValidationCodes.CAPABILITY_UNSUPPORTED,
          `nodes[${index}].type`,
          `Node type "${node.type}" is not supported by the current Capability Registry`,
        ),
      );
    }
  });

  definition.variables.forEach((variable, index) => {
    if (!registry.hasVariableType(variable.type)) {
      issues.push(
        error(
          ValidationCodes.CAPABILITY_UNSUPPORTED,
          `variables[${index}].type`,
          `Variable type "${variable.type}" is not supported by the current Capability Registry`,
        ),
      );
    }
  });

  definition.transitions.forEach((transition, index) => {
    if (transition.condition && !registry.hasOperator(transition.condition.operator)) {
      issues.push(
        error(
          ValidationCodes.CAPABILITY_UNSUPPORTED,
          `transitions[${index}].condition.operator`,
          `Operator "${transition.condition.operator}" is not supported by the current Capability Registry`,
        ),
      );
    }
  });

  definition.rules.forEach((rule, ruleIndex) => {
    if (!registry.hasOperator(rule.when.operator)) {
      issues.push(
        error(
          ValidationCodes.CAPABILITY_UNSUPPORTED,
          `rules[${ruleIndex}].when.operator`,
          `Operator "${rule.when.operator}" is not supported by the current Capability Registry`,
        ),
      );
    }
    rule.effects.forEach((effect, effectIndex) => {
      if (!registry.hasEffect(effect.type)) {
        issues.push(
          error(
            ValidationCodes.CAPABILITY_UNSUPPORTED,
            `rules[${ruleIndex}].effects[${effectIndex}].type`,
            `Effect "${effect.type}" is not supported by the current Capability Registry`,
          ),
        );
      }
    });
  });

  definition.assets.forEach((asset, index) => {
    if (!registry.hasMediaType(asset.type)) {
      issues.push(
        error(
          ValidationCodes.CAPABILITY_UNSUPPORTED,
          `assets[${index}].type`,
          `Media type "${asset.type}" is not supported by the current Capability Registry`,
        ),
      );
    }
  });

  return issues;
}
