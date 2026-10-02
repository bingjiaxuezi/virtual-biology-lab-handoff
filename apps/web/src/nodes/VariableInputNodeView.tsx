import type { VariableInputNode } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import { NodeActionBar } from '../components/NodeActionBar';
import { VariableControl } from '../components/VariableControl';
import type { NodeRendererProps } from './types';

export function VariableInputNodeView({
  node,
  definition,
  state,
  busy,
  onCommand,
  step,
  back,
}: NodeRendererProps) {
  const typed = node as VariableInputNode;
  const variable = definition.variables.find((v) => v.id === typed.config.variableId);
  const [value, setValue] = useState<number | string | boolean>(
    variable ? (state.variables[variable.id] ?? variable.defaultValue) : '',
  );
  const [done, setDone] = useState(false);

  if (!variable) {
    return (
      <section className="node-panel">
        <h2>变量缺失</h2>
        <p>变量「{typed.config.variableId}」不在实验定义中，请联系教师。</p>
      </section>
    );
  }

  return (
    <section className="node-panel">
      <h2>{typed.label ?? `设置${variable.name}`}</h2>
      {variable.description ? <p>{variable.description}</p> : null}
      <VariableControl
        variable={variable}
        inputMode={typed.config.inputMode}
        value={value}
        disabled={busy || done}
        onChange={setValue}
      />
      <NodeActionBar step={step} busy={busy} canBack={back.canBack} onBack={back.onBack}>
        {!done ? (
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={async () => {
              if (await onCommand({ type: 'SET_VARIABLE', variableId: variable.id, value })) {
                setDone(true);
              }
            }}
          >
            确认
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => onCommand({ type: 'ADVANCE' })}
          >
            继续
          </button>
        )}
      </NodeActionBar>
    </section>
  );
}
