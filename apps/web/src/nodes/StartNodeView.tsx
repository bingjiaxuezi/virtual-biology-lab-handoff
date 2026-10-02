import type { StartNode } from '@virtual-biology-lab/experiment-schema';
import { NodeActionBar } from '../components/NodeActionBar';
import type { NodeRendererProps } from './types';

export function StartNodeView({
  node,
  definition,
  busy,
  onCommand,
  step,
  back,
}: NodeRendererProps) {
  const typed = node as StartNode;
  return (
    <section className="node-panel">
      <h2>{definition.metadata.title}</h2>
      {typed.label ? <p className="node-label">{typed.label}</p> : null}
      {definition.teaching.objectives.length > 0 ? (
        <div>
          <h3>实验目标</h3>
          <ul className="objective-list">
            {definition.teaching.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <NodeActionBar step={step} busy={busy} canBack={back.canBack} onBack={back.onBack}>
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => onCommand({ type: 'ADVANCE' })}
        >
          进入实验
        </button>
      </NodeActionBar>
    </section>
  );
}
