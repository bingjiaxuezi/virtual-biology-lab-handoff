import type { ExperimentVariable } from '@virtual-biology-lab/experiment-schema';

interface VariableControlProps {
  variable: ExperimentVariable;
  inputMode: 'SLIDER' | 'NUMBER_INPUT' | 'SELECT' | 'TOGGLE';
  value: number | string | boolean;
  disabled: boolean;
  onChange: (value: number | string | boolean) => void;
}

/** 按变量类型与 inputMode 渲染对应控件，min/max/options 直接来自变量定义。 */
export function VariableControl({
  variable,
  inputMode,
  value,
  disabled,
  onChange,
}: VariableControlProps) {
  if (variable.type === 'NUMBER') {
    const current = typeof value === 'number' ? value : variable.defaultValue;
    if (inputMode === 'SLIDER') {
      return (
        <div className="variable-control">
          <input
            type="range"
            aria-label={variable.name}
            min={variable.min}
            max={variable.max}
            value={current}
            disabled={disabled}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <output>
            {current}
            {variable.unit ?? ''}
          </output>
        </div>
      );
    }
    return (
      <div className="variable-control">
        <input
          type="number"
          aria-label={variable.name}
          min={variable.min}
          max={variable.max}
          value={current}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="variable-range">
          {variable.min} ~ {variable.max}
          {variable.unit ?? ''}
        </span>
      </div>
    );
  }

  if (variable.type === 'ENUM') {
    const current = typeof value === 'string' ? value : variable.defaultValue;
    return (
      <div className="option-group" role="radiogroup" aria-label={variable.name}>
        {variable.options.map((option) => (
          <label key={option} className="option-item">
            <input
              type="radio"
              name={`variable-${variable.id}`}
              value={option}
              checked={current === option}
              disabled={disabled}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </div>
    );
  }

  const checked = typeof value === 'boolean' ? value : variable.defaultValue;
  return (
    <label className="toggle-item">
      <input
        type="checkbox"
        aria-label={variable.name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {checked ? '开启' : '关闭'}
    </label>
  );
}
