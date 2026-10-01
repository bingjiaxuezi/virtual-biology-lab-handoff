import type {
  Condition,
  ConditionValue,
  ExperimentVariable,
} from '@virtual-biology-lab/experiment-schema';

type VariableValues = Record<string, number | string | boolean>;

function compare(operator: Condition['operator'], left: number, right: number): boolean {
  switch (operator) {
    case 'GT':
      return left > right;
    case 'LT':
      return left < right;
    case 'GTE':
      return left >= right;
    case 'LTE':
      return left <= right;
    case 'EQ':
      return left === right;
    case 'NEQ':
      return left !== right;
  }
}

/**
 * 类型安全的条件求值：NUMBER 比较数值，ENUM/BOOLEAN 只做相等性判断。
 * 变量不存在或类型不匹配时返回 false（启动前 Validator 已保证合法性）。
 */
export function evaluateCondition(
  condition: Condition,
  variables: VariableValues,
  variableDefs?: Map<string, ExperimentVariable>,
): boolean {
  const actual = variables[condition.variableId];
  if (actual === undefined) return false;

  const def = variableDefs?.get(condition.variableId);
  if (def) {
    if (def.type !== 'NUMBER' && !['EQ', 'NEQ'].includes(condition.operator)) return false;
  }

  if (typeof actual === 'number' && typeof condition.value === 'number') {
    return compare(condition.operator, actual, condition.value);
  }

  switch (condition.operator) {
    case 'EQ':
      return actual === condition.value;
    case 'NEQ':
      return actual !== condition.value;
    default:
      return false;
  }
}

export type { ConditionValue };
export type { VariableValues };
