import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { RunEvent, RunView } from '../api/types';
import { Backpack } from '../components/Backpack';
import { FlowMap } from '../components/FlowMap';

export function ReviewPage() {
  const { runId = '' } = useParams<{ runId: string }>();
  const [run, setRun] = useState<RunView | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [definition, setDefinition] = useState<ExperimentDefinition | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getRun(runId), api.getEvents(runId)])
      .then(async ([runView, eventList]) => {
        const version = await api.getVersion(runView.experimentVersionId);
        setRun(runView);
        setEvents(eventList);
        setDefinition(version.definition);
      })
      .catch((cause: Error) => setError(cause.message));
  }, [runId]);

  if (error) return <p className="error-banner">{error}</p>;
  if (!run || !definition) return <p>加载中……</p>;

  const completedEvent = events.find((event) => event.type === 'RUN_COMPLETED');
  const outcome = completedEvent?.payload.outcome;

  return (
    <div className="page">
      <h1>实验复盘</h1>
      <section className="node-panel">
        <div className="review-hero">
          <span className="review-score">{run.state.score}</span>
          <span className="review-score-label">得分</span>
        </div>
        <p>状态：{run.status}</p>
        {typeof outcome === 'string' ? <p className="outcome">结果：{outcome}</p> : null}
        <p>
          开始于 {new Date(run.startedAt).toLocaleString()}
          {run.completedAt ? ` · 完成于 ${new Date(run.completedAt).toLocaleString()}` : ''}
        </p>
        <Link className="btn btn-secondary" to="/">
          返回实验目录
        </Link>
      </section>
      <div className="panel">
        <h3>实验流程</h3>
        <FlowMap
          definition={definition}
          events={events}
          currentNodeId={run.currentNodeId}
          canJump={false}
          onJump={() => undefined}
          revealAll
        />
      </div>
      <div className="panel">
        <h3>实验记录背包</h3>
        <Backpack events={events} definition={definition} />
      </div>
    </div>
  );
}
