import type {
  Condition,
  ConditionOperator,
  ExperimentDefinition,
  ExperimentVariable,
  RuleEffect,
} from '@virtual-biology-lab/experiment-schema';
import { ValidationCodes, type ValidationIssue, error, warning } from './errors.js';

/** 操作符与变量类型兼容表（NUMBER 允许全部比较；ENUM/BOOLEAN 仅相等性）。 */
const OPERATOR_COMPAT: Record<ExperimentVariable['type'], ConditionOperator[]> = {
  NUMBER: ['EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE'],
  ENUM: ['EQ', 'NEQ'],
  BOOLEAN: ['EQ', 'NEQ'],
};

function checkCondition(
  condition: Condition,
  path: string,
  variablesById: Map<string, ExperimentVariable>,
  issues: ValidationIssue[],
): void {
  const variable = variablesById.get(condition.variableId);
  if (!variable) {
    issues.push(
      error(
        ValidationCodes.VARIABLE_REF_UNDEFINED,
        `${path}.variableId`,
        `Condition references undefined variable "${condition.variableId}"`,
      ),
    );
    return;
  }

  if (!OPERATOR_COMPAT[variable.type].includes(condition.operator)) {
    issues.push(
      error(
        ValidationCodes.CONDITION_TYPE_INCOMPATIBLE,
        `${path}.operator`,
        `Operator "${condition.operator}" is not compatible with ${variable.type} variable "${variable.id}"`,
      ),
    );
  }

  const valueType = typeof condition.value;
  if (variable.type === 'NUMBER' && valueType !== 'number') {
    issues.push(
      error(
        ValidationCodes.CONDITION_VALUE_MISMATCH,
        `${path}.value`,
        `Condition on NUMBER variable "${variable.id}" must use a number value`,
      ),
    );
  } else if (variable.type === 'BOOLEAN' && valueType !== 'boolean') {
    issues.push(
      error(
        ValidationCodes.CONDITION_VALUE_MISMATCH,
        `${path}.value`,
        `Condition on BOOLEAN variable "${variable.id}" must use a boolean value`,
      ),
    );
  } else if (variable.type === 'ENUM') {
    if (valueType !== 'string') {
      issues.push(
        error(
          ValidationCodes.CONDITION_VALUE_MISMATCH,
          `${path}.value`,
          `Condition on ENUM variable "${variable.id}" must use a string value`,
        ),
      );
    } else if (!variable.options.includes(condition.value as string)) {
      issues.push(
        error(
          ValidationCodes.CONDITION_VALUE_MISMATCH,
          `${path}.value`,
          `Condition value "${String(condition.value)}" is not an option of ENUM variable "${variable.id}"`,
        ),
      );
    }
  }
}

function checkEffect(
  effect: RuleEffect,
  path: string,
  variablesById: Map<string, ExperimentVariable>,
  issues: ValidationIssue[],
): void {
  if (effect.type === 'SCORE') return;

  const variable = variablesById.get(effect.variableId);
  if (!variable) {
    issues.push(
      error(
        ValidationCodes.VARIABLE_REF_UNDEFINED,
        `${path}.variableId`,
        `Effect references undefined variable "${effect.variableId}"`,
      ),
    );
    return;
  }

  if ((effect.type === 'ADD' || effect.type === 'SUBTRACT') && variable.type !== 'NUMBER') {
    issues.push(
      error(
        ValidationCodes.EFFECT_TYPE_INCOMPATIBLE,
        path,
        `Effect "${effect.type}" requires a NUMBER variable, but "${variable.id}" is ${variable.type}`,
      ),
    );
  }

  if (effect.type === 'SET') {
    const expected =
      variable.type === 'NUMBER' ? 'number' : variable.type === 'BOOLEAN' ? 'boolean' : 'string';
    // biome-ignore lint/suspicious/useValidTypeof: expected 由变量类型决定，必为合法 typeof 字符串
    if (typeof effect.value !== expected) {
      issues.push(
        error(
          ValidationCodes.EFFECT_TYPE_INCOMPATIBLE,
          `${path}.value`,
          `SET value type "${typeof effect.value}" does not match ${variable.type} variable "${variable.id}"`,
        ),
      );
    } else if (variable.type === 'ENUM' && !variable.options.includes(effect.value as string)) {
      issues.push(
        error(
          ValidationCodes.EFFECT_TYPE_INCOMPATIBLE,
          `${path}.value`,
          `SET value "${String(effect.value)}" is not an option of ENUM variable "${variable.id}"`,
        ),
      );
    }
  }
}

/** Semantic Validator：图完整性、引用完整性、类型兼容。输入必须通过结构校验。 */
export function validateSemantics(definition: ExperimentDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. id 唯一性
  const nodeIds = new Map<string, number>();
  definition.nodes.forEach((node, index) => {
    const firstIndex = nodeIds.get(node.id);
    if (firstIndex !== undefined) {
      issues.push(
        error(
          ValidationCodes.NODE_ID_DUPLICATE,
          `nodes[${index}].id`,
          `Duplicate node id "${node.id}" (first defined at nodes[${firstIndex}])`,
        ),
      );
    } else {
      nodeIds.set(node.id, index);
    }
  });

  const transitionIds = new Set<string>();
  definition.transitions.forEach((transition, index) => {
    if (transitionIds.has(transition.id)) {
      issues.push(
        error(
          ValidationCodes.TRANSITION_ID_DUPLICATE,
          `transitions[${index}].id`,
          `Duplicate transition id "${transition.id}"`,
        ),
      );
    }
    transitionIds.add(transition.id);
  });

  const variablesById = new Map<string, ExperimentVariable>();
  definition.variables.forEach((variable, index) => {
    if (variablesById.has(variable.id)) {
      issues.push(
        error(
          ValidationCodes.VARIABLE_ID_DUPLICATE,
          `variables[${index}].id`,
          `Duplicate variable id "${variable.id}"`,
        ),
      );
    } else {
      variablesById.set(variable.id, variable);
    }
  });

  // 2. START / END 数量
  const startNodes = definition.nodes.filter((node) => node.type === 'START');
  if (startNodes.length === 0) {
    issues.push(
      error(
        ValidationCodes.START_MISSING,
        'nodes',
        'Experiment must have exactly one START node, found none',
      ),
    );
  } else if (startNodes.length > 1) {
    issues.push(
      error(
        ValidationCodes.START_DUPLICATE,
        'nodes',
        `Experiment must have exactly one START node, found ${startNodes.length}`,
      ),
    );
  }

  const endNodes = definition.nodes.filter((node) => node.type === 'END');
  if (endNodes.length === 0) {
    issues.push(
      error(ValidationCodes.END_MISSING, 'nodes', 'Experiment must have at least one END node'),
    );
  }

  // 3. Transition 端点存在
  definition.transitions.forEach((transition, index) => {
    if (!nodeIds.has(transition.from)) {
      issues.push(
        error(
          ValidationCodes.TRANSITION_SOURCE_MISSING,
          `transitions[${index}].from`,
          `Transition "${transition.id}" source "${transition.from}" does not exist`,
        ),
      );
    }
    if (!nodeIds.has(transition.to)) {
      issues.push(
        error(
          ValidationCodes.TRANSITION_TARGET_MISSING,
          `transitions[${index}].to`,
          `Transition "${transition.id}" target "${transition.to}" does not exist`,
        ),
      );
    }
  });

  // 4. 可达性：从唯一 START 出发 BFS（允许有环）
  const startNode = startNodes[0];
  if (startNode) {
    const adjacency = new Map<string, string[]>();
    for (const transition of definition.transitions) {
      const targets = adjacency.get(transition.from) ?? [];
      targets.push(transition.to);
      adjacency.set(transition.from, targets);
    }
    const reachable = new Set<string>([startNode.id]);
    const queue = [startNode.id];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const next of adjacency.get(current) ?? []) {
        if (!reachable.has(next)) {
          reachable.add(next);
          queue.push(next);
        }
      }
    }
    definition.nodes.forEach((node, index) => {
      if (reachable.has(node.id)) return;
      if (node.type === 'END') {
        issues.push(
          error(
            ValidationCodes.END_UNREACHABLE,
            `nodes[${index}]`,
            `END node "${node.id}" is unreachable from START`,
          ),
        );
      } else {
        issues.push(
          warning(
            ValidationCodes.NODE_UNREACHABLE,
            `nodes[${index}]`,
            `Node "${node.id}" (${node.type}) is unreachable from START`,
          ),
        );
      }
    });
  }

  // 5. 引用完整性 + 类型兼容：节点
  const declaredAssetIds = new Set(definition.assets.map((asset) => asset.assetId));
  definition.nodes.forEach((node, index) => {
    if (node.type === 'VARIABLE_INPUT') {
      const variableId = node.config.variableId;
      if (!variablesById.has(variableId)) {
        issues.push(
          error(
            ValidationCodes.VARIABLE_REF_UNDEFINED,
            `nodes[${index}].config.variableId`,
            `VARIABLE_INPUT references undefined variable "${variableId}"`,
          ),
        );
      }
    } else if (node.type === 'MEDIA') {
      if (!declaredAssetIds.has(node.config.assetId)) {
        issues.push(
          error(
            ValidationCodes.ASSET_REF_UNDEFINED,
            `nodes[${index}].config.assetId`,
            `MEDIA node references undeclared assetId "${node.config.assetId}"`,
          ),
        );
      }
    } else if (node.type === 'CONDITION') {
      checkCondition(
        node.config.condition,
        `nodes[${index}].config.condition`,
        variablesById,
        issues,
      );
    }
  });

  // 6. 引用完整性 + 类型兼容：Transition condition
  definition.transitions.forEach((transition, index) => {
    if (transition.condition) {
      checkCondition(
        transition.condition,
        `transitions[${index}].condition`,
        variablesById,
        issues,
      );
    }
  });

  // 7. 引用完整性 + 类型兼容：Rule
  definition.rules.forEach((rule, ruleIndex) => {
    checkCondition(rule.when, `rules[${ruleIndex}].when`, variablesById, issues);
    rule.effects.forEach((effect, effectIndex) => {
      checkEffect(effect, `rules[${ruleIndex}].effects[${effectIndex}]`, variablesById, issues);
    });
  });

  return issues;
}
