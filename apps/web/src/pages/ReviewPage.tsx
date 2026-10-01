import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { RunEvent, RunView } from '../api/types';
import { EventTrail } from '../components/EventTrail';

export function ReviewPage() {
  const { runId = '' } = useParams<{ runId: string }>();
  const [run, setRun] = useState<RunView | null>(null);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getRun(runId), api.getEvents(runId)])
      .then(([runView, eventList]) => {
        setRun(runView);
        setEvents(eventList);
      })
      .catch((cause: Error) => setError(cause.message));
  }, [runId]);

  if (error) return <p className="error-banner">{error}</p>;
  if (!run) return <p>加载中……</p>;

  const completedEvent = events.find((event) => event.type === 'RUN_COMPLETED');
  const outcome = completedEvent?.payload.outcome;

  return (
    <div className="page">
      <h1>实验复盘</h1>
      <section className="node-panel">
        <p>状态：{run.status}</p>
        {typeof outcome === 'string' ? <p className="outcome">结果：{outcome}</p> : null}
        <p className="score">得分：{run.state.score}</p>
        <p>
          开始于 {new Date(run.startedAt).toLocaleString()}
          {run.completedAt ? ` · 完成于 ${new Date(run.completedAt).toLocaleString()}` : ''}
        </p>
        <Link className="link-button" to="/">
          返回实验目录
        </Link>
      </section>
      <EventTrail events={events} />
    </div>
  );
}
