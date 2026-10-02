import { experimentDefinitionSchema } from '@virtual-biology-lab/experiment-schema';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { useState } from 'react';
import { ApiError, api } from '../api/client';
import type { AiProposal } from '../api/types';
import { PreviewModal } from '../preview/PreviewModal';

type Mode = 'generate' | 'change';

/** AI Copilot 面板：生成/修改 → 提案审阅 → 应用/丢弃/试玩。 */
export function CopilotPanel({
  experimentId,
  onApply,
  onClose,
}: {
  experimentId: string;
  onApply: (definition: ExperimentDefinition) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Mode>('generate');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const run = async () => {
    if (text.trim() === '') return;
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === 'generate'
          ? await api.aiGenerate(experimentId, text)
          : await api.aiChange(experimentId, text);
      setProposal(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `请求失败（${err.status}）：${err.message}`
          : err instanceof Error
            ? err.message
            : '请求失败',
      );
    } finally {
      setBusy(false);
    }
  };

  const parsed = proposal ? experimentDefinitionSchema.safeParse(proposal.definition) : null;
  const applicable = parsed?.success === true;
  const errors = proposal?.issues.filter((i) => i.severity === 'error') ?? [];

  return (
    <div className="modal-backdrop">
      <div className="modal copilot-modal">
        <div className="modal-header">
          <h3>AI Copilot（提案不保存、不发布，确认后写入草稿）</h3>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="segmented copilot-tabs">
          <button
            type="button"
            className={mode === 'generate' ? 'active' : ''}
            onClick={() => {
              setMode('generate');
              setProposal(null);
            }}
          >
            生成实验
          </button>
          <button
            type="button"
            className={mode === 'change' ? 'active' : ''}
            onClick={() => {
              setMode('change');
              setProposal(null);
            }}
          >
            修改当前草稿
          </button>
        </div>

        <label className="field">
          <span>{mode === 'generate' ? '教学意图' : '修改指令'}</span>
          <textarea
            value={text}
            placeholder={
              mode === 'generate'
                ? '例：生成一个探究光照强度对光合作用速率影响的实验，面向初中学生'
                : '例：把温度上限改为 120，并在开始后增加一个预测性提问'
            }
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <div className="panel-actions">
          <button type="button" disabled={busy || text.trim() === ''} onClick={() => void run()}>
            {busy ? '生成中…' : mode === 'generate' ? '生成草案' : '生成修改提案'}
          </button>
        </div>
        {error && <p className="panel-hint error">{error}</p>}

        {proposal && (
          <div className="proposal">
            <div className="panel-card-row">
              <span className="tag">Provider: {proposal.provider}</span>
              {proposal.needsReview ? (
                <span className="tag warn">needsReview：仍有 {errors.length} 个 error</span>
              ) : (
                <span className="tag ok-tag">校验通过</span>
              )}
            </div>

            {proposal.summary && (
              <div className="panel-card">
                <strong>变更摘要（服务端生成）</strong>
                <ul>
                  {proposal.summary.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}

            {proposal.issues.length > 0 && (
              <div className="panel-card">
                <strong>校验问题</strong>
                {proposal.issues.map((issue, index) => (
                  <div key={`${issue.code}-${index}`} className={`issue issue-${issue.severity}`}>
                    <span className="issue-code">{issue.code}</span>
                    <span className="issue-message">{issue.message}</span>
                    <span className="issue-path">{issue.path}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="panel-actions">
              <button
                type="button"
                disabled={!applicable}
                title={applicable ? '' : '结构不可解析，无法应用'}
                onClick={() => {
                  if (parsed?.success) {
                    onApply(parsed.data);
                    onClose();
                  }
                }}
              >
                应用到草稿
              </button>
              <button
                type="button"
                disabled={!applicable}
                onClick={() => applicable && setPreviewing(true)}
              >
                试玩提案
              </button>
              <button type="button" onClick={() => setProposal(null)}>
                丢弃
              </button>
            </div>
            {!applicable && (
              <p className="panel-hint error">提案结构不可解析，无法应用或试玩，请重新生成。</p>
            )}
          </div>
        )}
      </div>
      {previewing && parsed?.success && (
        <PreviewModal definition={parsed.data} onClose={() => setPreviewing(false)} />
      )}
    </div>
  );
}
