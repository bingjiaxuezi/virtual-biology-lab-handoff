import type { ObservationNode } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import { ApiError, api } from '../api/client';
import { NodeActionBar } from '../components/NodeActionBar';
import type { NodeRendererProps } from './types';

export function ObservationNodeView({ node, busy, onCommand, step, back, ai }: NodeRendererProps) {
  const typed = node as ObservationNode;
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const askAssist = async () => {
    if (!ai) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const result = await api.aiObservationAssist(ai.runId, text);
      setSuggestion(result.suggestion);
    } catch (cause) {
      setAiError(
        cause instanceof ApiError && cause.status === 403
          ? '本实验未开启观察助手'
          : cause instanceof Error
            ? cause.message
            : 'AI 请求失败',
      );
    } finally {
      setAiBusy(false);
    }
  };

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
      <NodeActionBar step={step} busy={busy} canBack={back.canBack} onBack={back.onBack}>
        {ai?.observationAssistEnabled && !done && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy || aiBusy}
            onClick={() => void askAssist()}
          >
            {aiBusy ? '思考中…' : 'AI 完善建议'}
          </button>
        )}
        {!done ? (
          <button
            type="button"
            className="btn btn-primary"
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
            className="btn btn-primary"
            disabled={busy}
            onClick={() => onCommand({ type: 'ADVANCE' })}
          >
            继续
          </button>
        )}
      </NodeActionBar>
      {aiError && <p className="ai-error">{aiError}</p>}
      {suggestion && !done && (
        <div className="ai-suggestion">
          <p>{suggestion}</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              // 采纳 = 只填充输入框，学生可继续编辑，提交仍由学生触发
              // 已有内容时追加建议，避免覆盖学生自己的记录
              setText((prev) => (prev.trim() ? `${prev}\n${suggestion}` : suggestion));
              setSuggestion(null);
            }}
          >
            采纳到输入框
          </button>
        </div>
      )}
    </section>
  );
}
