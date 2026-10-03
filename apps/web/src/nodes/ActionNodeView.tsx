import type { ActionNode } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import { NodeActionBar } from '../components/NodeActionBar';
import type { NodeRendererProps } from './types';

export function ActionNodeView({ node, busy, onCommand, step, back }: NodeRendererProps) {
  const typed = node as ActionNode;
  const [done, setDone] = useState(false);

  return (
    <section className="node-panel">
      <h2>{typed.label ?? '实验操作'}</h2>
      <p className="action-kind">{typed.config.actionKind}</p>
      {typed.config.description ? <p>{typed.config.description}</p> : null}
      <NodeActionBar step={step} busy={busy} canBack={back.canBack} onBack={back.onBack}>
        {!done ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={async () => {
              if (await onCommand({ type: 'PERFORM_ACTION' })) setDone(true);
            }}
          >
            执行操作
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
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
