import type { QuestionNode } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import { NodeActionBar } from '../components/NodeActionBar';
import type { NodeRendererProps } from './types';

export function QuestionNodeView({ node, busy, onCommand, step, back }: NodeRendererProps) {
  const typed = node as QuestionNode;
  const [answer, setAnswer] = useState('');
  const [done, setDone] = useState(false);
  const options = typed.config.options;

  return (
    <section className="node-panel">
      <h2>{typed.label ?? '思考问题'}</h2>
      <p>{typed.config.prompt}</p>
      {options && options.length > 0 ? (
        <div className="option-group" role="radiogroup" aria-label="选项">
          {options.map((option) => (
            <label key={option} className="option-item">
              <input
                type="radio"
                name={`question-${typed.id}`}
                value={option}
                checked={answer === option}
                disabled={busy || done}
                onChange={() => setAnswer(option)}
              />
              {option}
            </label>
          ))}
        </div>
      ) : (
        <input
          type="text"
          aria-label="回答"
          value={answer}
          disabled={busy || done}
          onChange={(event) => setAnswer(event.target.value)}
        />
      )}
      <NodeActionBar step={step} busy={busy} canBack={back.canBack} onBack={back.onBack}>
        {!done ? (
          <button
            type="button"
            className="primary"
            disabled={busy || !answer.trim()}
            onClick={async () => {
              if (await onCommand({ type: 'ANSWER_QUESTION', answer })) setDone(true);
            }}
          >
            提交回答
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
