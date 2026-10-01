import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CatalogItem } from '../api/types';
import { getStudentId } from '../student';

export function CatalogPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .listCatalog()
      .then(setItems)
      .catch((cause: Error) => setError(cause.message));
  }, []);

  async function startExperiment(item: CatalogItem) {
    setStartingId(item.experimentId);
    setError(null);
    try {
      const run = await api.createRun(item.latestVersion.id, getStudentId());
      await api.startRun(run.runId);
      navigate(`/runs/${run.runId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建运行失败');
      setStartingId(null);
    }
  }

  return (
    <div className="page">
      <h1>实验目录</h1>
      {error ? <p className="error-banner">{error}</p> : null}
      {items === null ? (
        <p>加载中……</p>
      ) : items.length === 0 ? (
        <p className="empty-hint">还没有已发布的实验，请等待教师发布。</p>
      ) : (
        <ul className="catalog-list">
          {items.map((item) => (
            <li key={item.experimentId} className="catalog-item">
              <div>
                <strong>{item.title}</strong>
                <span className="catalog-meta">
                  v{item.latestVersion.version} · 发布于{' '}
                  {new Date(item.latestVersion.publishedAt).toLocaleDateString()}
                </span>
              </div>
              <button
                type="button"
                className="primary"
                disabled={startingId !== null}
                onClick={() => startExperiment(item)}
              >
                {startingId === item.experimentId ? '正在创建……' : '开始实验'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
