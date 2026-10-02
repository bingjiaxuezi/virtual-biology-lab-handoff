import type { ExperimentDefinition, ExperimentNode } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import { ApiError, api } from '../api/client';

/**
 * 学生端 AI 助教：导读（START）/ 提示（任意节点）/ 复盘（完成后）。
 * 入口随 aiPolicy 显隐；只读，绝不触碰运行状态。
 */
export function AiAssistant({
  runId,
  node,
  definition,
  status,
}: {
  runId: string;
  node: ExperimentNode;
  definition: ExperimentDefinition;
  status: string;
}) {
  const policy = definition.aiPolicy;
  const showBriefing = policy.briefing.enabled && node.type === 'START';
  const showHint = policy.tutor.enabled;
  const showReview = policy.review.enabled && status === 'COMPLETED';

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!showBriefing && !showHint && !showReview) return null;

  const call = async (kind: string, fn: () => Promise<{ text: string }>) => {
    setBusy(kind);
    setError(null);
    try {
      const result = await fn();
      setText(result.text);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 403) setError('本实验未开启此 AI 功能');
      else if (cause instanceof ApiError && cause.status === 409) setError('实验完成后才能复盘');
      else setError(cause instanceof Error ? cause.message : 'AI 请求失败');
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside className="ai-assistant" aria-label="AI 助教">
      <h3>AI 助教</h3>
      <div className="ai-actions">
        {showBriefing && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void call('briefing', () => api.aiBriefing(runId))}
          >
            {busy === 'briefing' ? '生成中…' : '实验导读'}
          </button>
        )}
        {showHint && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void call('hint', () => api.aiHint(runId))}
          >
            {busy === 'hint' ? '思考中…' : '求助 AI'}
          </button>
        )}
        {showReview && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void call('review', () => api.aiReview(runId))}
          >
            {busy === 'review' ? '生成中…' : '生成复盘'}
          </button>
        )}
      </div>
      {error && <p className="ai-error">{error}</p>}
      {text && !error && <p className="ai-text">{text}</p>}
    </aside>
  );
}
