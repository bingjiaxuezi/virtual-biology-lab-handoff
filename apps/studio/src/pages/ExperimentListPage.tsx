import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { ExperimentRecord } from '../api/types';
import { useAuth } from '../auth/auth';
import { createBlankDefinition } from '../editor/blank';

/** 实验列表：新建 / 编辑 / 发布 / 删除 / 查看学生运行。 */
export function ExperimentListPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<ExperimentRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const refresh = useCallback(async () => {
    setExperiments(await api.listExperiments());
  }, []);

  useEffect(() => {
    refresh().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [refresh]);

  const create = async () => {
    const title = newTitle.trim() || '未命名实验';
    const result = await api.createExperiment(
      title,
      createBlankDefinition(title, crypto.randomUUID()),
    );
    setNewTitle('');
    navigate(`/experiments/${result.experiment.id}/edit`);
  };

  const publish = async (experiment: ExperimentRecord) => {
    setError(null);
    setNotice(null);
    try {
      const result = await api.publishExperiment(experiment.id);
      setNotice(`「${experiment.title}」已发布为 v${result.version.version}`);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        setError(`「${experiment.title}」发布失败：存在校验问题，请进入编辑器查看问题面板`);
      } else {
        setError(err instanceof Error ? err.message : '发布失败');
      }
    }
  };

  const remove = async (experiment: ExperimentRecord) => {
    if (!window.confirm(`确认删除「${experiment.title}」的草稿？`)) return;
    setError(null);
    try {
      await api.deleteExperiment(experiment.id);
      await refresh();
    } catch {
      setError('删除失败：已发布过版本的实验不可删除（版本不可变）。');
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>实验管理</h1>
        <div className="topbar-actions">
          <input
            value={newTitle}
            placeholder="新实验标题"
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void create()}
          />
          <button type="button" onClick={() => void create()}>
            新建实验
          </button>
          <button type="button" onClick={logout}>
            退出登录
          </button>
        </div>
      </header>
      {error && <p className="panel-hint error">{error}</p>}
      {notice && <p className="panel-hint ok">{notice}</p>}
      {!experiments && <p className="panel-hint">加载中…</p>}
      {experiments?.length === 0 && <p className="panel-hint">还没有实验，点击「新建实验」开始</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>草稿更新</th>
            <th>已发布版本</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {experiments?.map((experiment) => {
            const latest = experiment.versions.reduce(
              (max, v) => (v.version > (max?.version ?? 0) ? v : max),
              experiment.versions[0],
            );
            return (
              <tr key={experiment.id}>
                <td>{experiment.title}</td>
                <td>{new Date(experiment.updatedAt).toLocaleString()}</td>
                <td>{latest ? `v${latest.version}` : '未发布'}</td>
                <td className="row-actions">
                  <Link to={`/experiments/${experiment.id}/edit`}>编辑</Link>
                  <button type="button" onClick={() => void publish(experiment)}>
                    发布
                  </button>
                  <Link to={`/experiments/${experiment.id}/runs`}>学生运行</Link>
                  <button type="button" className="danger" onClick={() => void remove(experiment)}>
                    删除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
