import type { ObservationNode } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import type { NodeRendererProps } from './types';

export function ObservationNodeView({ node, busy, onCommand }: NodeRendererProps) {
  const typed = node as ObservationNode;
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);

  return (
    <section className="node-panel">
      <h2>{typed.label ?? '观察记录'}</h2>
      <p>{typed.config.prompt}</p>
      <textarea
        aria-label="观察结果"
        rows={4}
        placeholder={typed.config.placeholder ?? '描述你观察到的现象……'}
        value={text}
        disabled={busy || done}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="button-row">
        {!done ? (
          <button
            type="button"
            className="primary"
            disabled={busy || !text.trim()}
            onClick={async () => {
              if (await onCommand({ type: 'SUBMIT_OBSERVATION', text })) setDone(true);
            }}
          >
            提交观察
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
      </div>
    </section>
  );
}
