import type { ConditionNode, ConditionOperator } from '@virtual-biology-lab/experiment-schema';
import type { NodeRendererProps } from './types';

const OPERATOR_LABEL: Record<ConditionOperator, string> = {
  EQ: '＝',
  NEQ: '≠',
  GT: '＞',
  LT: '＜',
  GTE: '≥',
  LTE: '≤',
};

export function ConditionNodeView({ node, definition, state, busy, onCommand }: NodeRendererProps) {
  const typed = node as ConditionNode;
  const { variableId, operator, value } = typed.config.condition;
  const variable = definition.variables.find((v) => v.id === variableId);
  const current = state.variables[variableId];

  return (
    <section className="node-panel">
      <h2>{typed.label ?? '条件判断'}</h2>
      <p>
        判断条件：{variable?.name ?? variableId} {OPERATOR_LABEL[operator]} {String(value)}
      </p>
      <p className="condition-current">
        当前值：<strong>{String(current)}</strong>
      </p>
      <button
        type="button"
        className="primary"
        disabled={busy}
        onClick={() => onCommand({ type: 'ADVANCE' })}
      >
        查看结果
      </button>
    </section>
  );
}
