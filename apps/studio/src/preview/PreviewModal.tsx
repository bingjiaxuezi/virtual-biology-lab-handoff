import type { ExperimentEvent } from '@virtual-biology-lab/experiment-events';
import type { RunView, RuntimeCommand } from '@virtual-biology-lab/experiment-runtime';
import type { ExperimentDefinition, ExperimentNode } from '@virtual-biology-lab/experiment-schema';
import { useEffect, useRef, useState } from 'react';
import { PreviewSession } from './session';

/** 试玩弹窗：浏览器内运行草稿，零 API 请求。 */
export function PreviewModal({
  definition,
  onClose,
}: {
  definition: ExperimentDefinition;
  onClose: () => void;
}) {
  const [session, setSession] = useState<PreviewSession | null>(null);
  const [run, setRun] = useState<RunView | null>(null);
  const [events, setEvents] = useState<ExperimentEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const sessionRef = useRef<PreviewSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    PreviewSession.start(definition)
      .then(async (s) => {
        if (cancelled) return;
        sessionRef.current = s;
        setSession(s);
        setRun(s.getRun());
        setEvents(await s.events());
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [definition]);

  const send = async (command: RuntimeCommand) => {
    const s = sessionRef.current;
    if (!s) return;
    setRejectReason(null);
    const result = await s.dispatch(command);
    if (!result.ok) setRejectReason(result.reason);
    setRun(s.getRun());
    setEvents(await s.events());
  };

  const node = run ? definition.nodes.find((n) => n.id === run.currentNodeId) : undefined;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h3>试玩（本地运行，不产生任何记录）</h3>
          <button type="button" onClick={onClose}>
            关闭
          </button>
        </div>
        {error && <p className="panel-hint error">{error}</p>}
        {!error && !session && <p className="panel-hint">正在启动…</p>}
        {run && node && (
          <div className="preview-body">
            <div className="preview-node">
              <PreviewNodeView node={node} run={run} definition={definition} onCommand={send} />
              {rejectReason && <p className="panel-hint error">操作被拒绝：{rejectReason}</p>}
            </div>
            <div className="preview-trail">
              <h4>事件轨迹</h4>
              <p className="panel-hint">
                状态 {run.status} · 得分 {run.state.score}
              </p>
              <ol>
                {events.map((event) => (
                  <li key={event.eventId}>
                    <code>{event.sequence}</code> {event.type}
                    {event.nodeId ? ` · ${event.nodeId}` : ''}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewNodeView({
  node,
  run,
  definition,
  onCommand,
}: {
  node: ExperimentNode;
  run: RunView;
  definition: ExperimentDefinition;
  onCommand: (command: RuntimeCommand) => void;
}) {
  switch (node.type) {
    case 'START':
      return (
        <div>
          <h4>{node.label ?? '开始'}</h4>
          <p>{definition.metadata.description ?? definition.metadata.title}</p>
          <button type="button" onClick={() => onCommand({ type: 'ADVANCE' })}>
            开始实验
          </button>
        </div>
      );
    case 'ACTION':
      return (
        <div>
          <h4>{node.label ?? node.config.actionKind}</h4>
          {node.config.description && <p>{node.config.description}</p>}
          <button type="button" onClick={() => onCommand({ type: 'PERFORM_ACTION' })}>
            执行操作
          </button>
        </div>
      );
    case 'VARIABLE_INPUT':
      return (
        <VariableInputPreview node={node} run={run} definition={definition} onCommand={onCommand} />
      );
    case 'MEDIA':
      return (
        <div>
          <h4>{node.label ?? node.config.assetId}</h4>
          <p className="panel-hint">
            [{node.config.mediaType}] 资源 {node.config.assetId}
            {node.config.caption ? ` · ${node.config.caption}` : ''}
          </p>
          <button type="button" onClick={() => onCommand({ type: 'ADVANCE' })}>
            继续
          </button>
        </div>
      );
    case 'OBSERVATION':
      return <ObservationPreview node={node} onCommand={onCommand} />;
    case 'QUESTION':
      return <QuestionPreview node={node} onCommand={onCommand} />;
    case 'CONDITION':
      return (
        <div>
          <h4>{node.label ?? '条件判断'}</h4>
          <p className="panel-hint">系统自动判断中…</p>
          <button type="button" onClick={() => onCommand({ type: 'ADVANCE' })}>
            继续
          </button>
        </div>
      );
    case 'END':
      return (
        <div>
          <h4>实验结束</h4>
          <p>
            结局 {node.config?.outcome ?? '完成'} · 得分 {run.state.score}
          </p>
        </div>
      );
  }
}

function VariableInputPreview({
  node,
  run,
  definition,
  onCommand,
}: {
  node: ExperimentNode & { type: 'VARIABLE_INPUT' };
  run: RunView;
  definition: ExperimentDefinition;
  onCommand: (command: RuntimeCommand) => void;
}) {
  const variable = definition.variables.find((v) => v.id === node.config.variableId);
  const current = run.state.variables[node.config.variableId];
  const [value, setValue] = useState<number | string | boolean>(
    current ?? variable?.defaultValue ?? 0,
  );

  if (!variable) return <p className="panel-hint error">变量 {node.config.variableId} 未定义</p>;

  return (
    <div>
      <h4>{node.label ?? variable.name}</h4>
      {variable.type === 'NUMBER' && (
        <label className="field">
          <span>
            {variable.name}（{variable.min} ~ {variable.max}
            {variable.unit ? ` ${variable.unit}` : ''}）
          </span>
          <input
            type="range"
            min={variable.min}
            max={variable.max}
            value={Number(value)}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <span>{String(value)}</span>
        </label>
      )}
      {variable.type === 'ENUM' && (
        <select value={String(value)} onChange={(e) => setValue(e.target.value)}>
          {variable.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {variable.type === 'BOOLEAN' && (
        <label className="field-inline">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => setValue(e.target.checked)}
          />
          <span>{variable.name}</span>
        </label>
      )}
      <button
        type="button"
        onClick={() => onCommand({ type: 'SET_VARIABLE', variableId: variable.id, value })}
      >
        确认
      </button>
    </div>
  );
}

function ObservationPreview({
  node,
  onCommand,
}: {
  node: ExperimentNode & { type: 'OBSERVATION' };
  onCommand: (command: RuntimeCommand) => void;
}) {
  const [text, setText] = useState('');
  return (
    <div>
      <h4>{node.label ?? '观察记录'}</h4>
      <p>{node.config.prompt}</p>
      <textarea
        value={text}
        placeholder={node.config.placeholder ?? ''}
        onChange={(e) => setText(e.target.value)}
      />
      <button type="button" onClick={() => onCommand({ type: 'SUBMIT_OBSERVATION', text })}>
        提交观察
      </button>
    </div>
  );
}

function QuestionPreview({
  node,
  onCommand,
}: {
  node: ExperimentNode & { type: 'QUESTION' };
  onCommand: (command: RuntimeCommand) => void;
}) {
  const [answer, setAnswer] = useState('');
  return (
    <div>
      <h4>{node.label ?? '提问'}</h4>
      <p>{node.config.prompt}</p>
      {node.config.options ? (
        <div className="preview-options">
          {node.config.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onCommand({ type: 'ANSWER_QUESTION', answer: opt })}
            >
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <>
          <input value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <button type="button" onClick={() => onCommand({ type: 'ANSWER_QUESTION', answer })}>
            作答
          </button>
        </>
      )}
    </div>
  );
}
