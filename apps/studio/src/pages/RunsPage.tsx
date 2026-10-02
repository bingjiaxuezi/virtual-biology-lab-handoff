import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { ExperimentRecord, RunSummary, TrailEvent } from '../api/types';

/** 学生轨迹：实验 → Run 列表 → 单个 Run 的完整事件流（只读）。 */
export function RunsPage() {
  const { id = '' } = useParams();
  const [experiment, setExperiment] = useState<ExperimentRecord | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [events, setEvents] = useState<TrailEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getExperiment(id), api.listRuns(id)])
      .then(([exp, runList]) => {
        setExperiment(exp);
        setRuns(runList);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  useEffect(() => {
    if (!selectedRunId) return;
    setEvents(null);
    api
      .getRunEvents(selectedRunId)
      .then(setEvents)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [selectedRunId]);

  if (error) {
    return (
      <div className="page">
        <p className="panel-hint error">{error}</p>
        <Link to="/">返回列表</Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="back-link">
          ← 列表
        </Link>
        <h1>学生运行 · {experiment?.title ?? '…'}</h1>
      </header>
      {!runs && <p className="panel-hint">加载中…</p>}
      {runs?.length === 0 && <p className="panel-hint">还没有学生运行过这个实验</p>}
      <div className="runs-layout">
        <table className="data-table">
          <thead>
            <tr>
              <th>学生</th>
              <th>版本</th>
              <th>状态</th>
              <th>得分</th>
              <th>开始时间</th>
            </tr>
          </thead>
          <tbody>
            {runs?.map((run) => (
              <tr
                key={run.runId}
                className={run.runId === selectedRunId ? 'selected-row' : ''}
                tabIndex={0}
                onClick={() => setSelectedRunId(run.runId)}
                onKeyDown={(e) => e.key === 'Enter' && setSelectedRunId(run.runId)}
              >
                <td>{run.studentId}</td>
                <td>v{run.version}</td>
                <td>{run.status}</td>
                <td>{run.score ?? '—'}</td>
                <td>{new Date(run.startedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {selectedRunId && (
          <div className="trail-panel">
            <h3>事件轨迹</h3>
            {!events && <p className="panel-hint">加载中…</p>}
            {events && (
              <ol>
                {events.map((event) => (
                  <li key={event.id}>
                    <code>{event.sequence}</code> <strong>{event.type}</strong>
                    {event.nodeId ? ` · ${event.nodeId}` : ''}
                    <span className="issue-path">
                      {' '}
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <pre>{JSON.stringify(event.payload)}</pre>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
