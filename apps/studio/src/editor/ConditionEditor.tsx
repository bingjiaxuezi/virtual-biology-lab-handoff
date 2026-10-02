import type {
  Condition,
  ConditionOperator,
  ConditionValue,
  ExperimentVariable,
} from '@virtual-biology-lab/experiment-schema';
import { BOOLEAN_LABEL, OPERATOR_LABEL } from './labels';

const OPERATORS: ConditionOperator[] = ['EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE'];

/** 条件表达式编辑器（CONDITION 节点 / Transition / Rule 共用），值控件随变量类型切换。 */
export function ConditionEditor({
  condition,
  variables,
  onChange,
}: {
  condition: Condition;
  variables: ExperimentVariable[];
  onChange: (next: Condition) => void;
}) {
  const variable = variables.find((v) => v.id === condition.variableId);

  const renderValueInput = () => {
    if (variable?.type === 'ENUM') {
      return (
        <select
          value={String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
        >
          {variable.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
    if (variable?.type === 'BOOLEAN') {
      return (
        <select
          value={String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
        >
          <option value="true">{BOOLEAN_LABEL.true}</option>
          <option value="false">{BOOLEAN_LABEL.false}</option>
        </select>
      );
    }
    if (variable?.type === 'NUMBER') {
      return (
        <input
          type="number"
          value={Number(condition.value)}
          onChange={(e) => onChange({ ...condition, value: Number(e.target.value) })}
        />
      );
    }
    // 变量未定义时退回自由输入：数字/布尔自动识别
    return (
      <input
        type="text"
        value={String(condition.value)}
        placeholder="值"
        onChange={(e) => onChange({ ...condition, value: parseFreeValue(e.target.value) })}
      />
    );
  };

  return (
    <div className="condition-editor">
      <select
        value={condition.variableId}
        onChange={(e) => onChange({ ...condition, variableId: e.target.value })}
      >
        <option value="">（选择变量）</option>
        {variables.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}（{v.id}）
          </option>
        ))}
      </select>
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
      >
        {OPERATORS.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABEL[op]}
          </option>
        ))}
      </select>
      {renderValueInput()}
    </div>
  );
}

function parseFreeValue(text: string): ConditionValue {
  if (text === 'true') return true;
  if (text === 'false') return false;
  const num = Number(text);
  if (text.trim() !== '' && !Number.isNaN(num)) return num;
  return text;
}
