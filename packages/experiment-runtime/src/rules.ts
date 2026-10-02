import type { RunState } from '@virtual-biology-lab/experiment-events';
import type {
  ExperimentDefinition,
  Rule,
  RuleEffect,
} from '@virtual-biology-lab/experiment-schema';
import { evaluateCondition } from './conditions.js';

export interface VariableChange {
  variableId: string;
  from: number | string | boolean;
  to: number | string | boolean;
}

export interface AppliedRuleStep {
  rule: Rule;
  stateAfter: RunState;
  variableChanges: VariableChange[];
  scoreDelta: number;
}

function applyEffect(state: RunState, effect: RuleEffect): RunState {
  const variables = { ...state.variables };
  switch (effect.type) {
    case 'SET':
      variables[effect.variableId] = effect.value;
      return { variables, score: state.score };
    case 'ADD': {
      const current = variables[effect.variableId];
      if (typeof current === 'number') variables[effect.variableId] = current + effect.value;
      return { variables, score: state.score };
    }
    case 'SUBTRACT': {
      const current = variables[effect.variableId];
      if (typeof current === 'number') variables[effect.variableId] = current - effect.value;
      return { variables, score: state.score };
    }
    case 'SCORE':
      return { variables, score: state.score + effect.value };
  }
}

function diffVariables(before: RunState, after: RunState): VariableChange[] {
  const changes: VariableChange[] = [];
  for (const [variableId, to] of Object.entries(after.variables)) {
    const from = before.variables[variableId];
    if (from !== undefined && from !== to) {
      changes.push({ variableId, from, to });
    }
  }
  return changes;
}

/**
 * 单遍规则求值：按 Definition 声明顺序，对逐步演进中的 State 判断 when；
 * 命中的 Rule 依次应用其 effects。v0.1 不做不动点迭代（无规则链）。
 * 传入 changedVariableId 时，只求值 when 引用该变量的 Rule，避免无关变量变化导致重复计分。
 * 传入 scoredRuleIds 时，SCORE 效果幂等：已计分 Rule 的 SCORE 效果跳过（SET/ADD/SUBTRACT 照常）。
 */
export function evaluateRules(
  definition: ExperimentDefinition,
  initialState: RunState,
  changedVariableId?: string,
  scoredRuleIds?: Set<string>,
): { state: RunState; steps: AppliedRuleStep[] } {
  const variableDefs = new Map(definition.variables.map((v) => [v.id, v]));
  let state = initialState;
  const steps: AppliedRuleStep[] = [];

  for (const rule of definition.rules) {
    if (changedVariableId !== undefined && rule.when.variableId !== changedVariableId) continue;
    if (!evaluateCondition(rule.when, state.variables, variableDefs)) continue;
    let next = state;
    for (const effect of rule.effects) {
      // SCORE 幂等：每条 Rule 每 Run 至多计分一次；其余效果（状态推导）照常
      if (effect.type === 'SCORE' && scoredRuleIds?.has(rule.id)) continue;
      next = applyEffect(next, effect);
      if (effect.type === 'SCORE') scoredRuleIds?.add(rule.id);
    }
    steps.push({
      rule,
      stateAfter: next,
      variableChanges: diffVariables(state, next),
      scoreDelta: next.score - state.score,
    });
    state = next;
  }

  return { state, steps };
}

/** 初始 State：变量 defaultValue + assessment.initialScore。 */
export function buildInitialState(definition: ExperimentDefinition): RunState {
  const variables: RunState['variables'] = {};
  for (const variable of definition.variables) {
    variables[variable.id] = variable.defaultValue;
  }
  return { variables, score: definition.assessment.initialScore };
}
