/**
 * 会话流程测试：用真实 experiment-runtime + InMemoryEventLog 实现一个内存版「后端」，
 * mock fetch 把 API 请求路由给它，验证前端从目录到完成的完整 80℃ 高温路径。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InMemoryEventLog } from '@virtual-biology-lab/experiment-events';
import { createExperimentRuntime } from '@virtual-biology-lab/experiment-runtime';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { loadSampleDefinition } from './fixtures';

const definition: Record<string, unknown> = loadSampleDefinition();

/** 内存版后端：行为与 Phase 3 API 对齐（无状态 dispatch 语义由 runtime 保证）。 */
function installFakeServer() {
  const eventLog = new InMemoryEventLog();
  const runtime = createExperimentRuntime({ eventLog });
  const versionId = 'ver1';
  let runId: string | null = null;

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    if (method === 'GET' && path === '/api/catalog') {
      return json([
        {
          experimentId: 'exp1',
          title: '温度对酶活性的影响',
          latestVersion: { id: versionId, version: 1, publishedAt: new Date().toISOString() },
        },
      ]);
    }
    if (method === 'GET' && path === `/api/catalog/versions/${versionId}`) {
      return json({
        id: versionId,
        experimentId: 'exp1',
        version: 1,
        publishedAt: new Date().toISOString(),
        definition,
      });
    }
    if (method === 'POST' && path === '/api/runs') {
      const started = runtime.startRun({
        definition,
        experimentVersionId: versionId,
        studentId: body.studentId,
      });
      if (!started.ok) return json({ message: 'invalid' }, 500);
      runId = started.run.runId;
      return json({ ...started.run, lastSequence: 0, completedAt: null });
    }
    const runMatch = path.match(/^\/api\/runs\/([^/]+)(\/start|\/dispatch|\/events)?$/);
    if (runMatch) {
      const [, id, action] = runMatch;
      if (method === 'GET' && !action) {
        const view = runtime.getRun(id!);
        return view
          ? json({ ...view, lastSequence: await eventLog.lastSequence(id!), completedAt: null })
          : json({ message: 'not found' }, 404);
      }
      if (method === 'GET' && action === '/events') return json(await eventLog.getByRun(id!));
      if (method === 'POST' && (action === '/start' || action === '/dispatch')) {
        // 与 RunsService.apply 对齐：结果附带最新 run 视图
        const result =
          action === '/start' ? await runtime.start(id!) : await runtime.dispatch(id!, body);
        const view = runtime.getRun(id!)!;
        return json({
          ...result,
          run: { ...view, lastSequence: await eventLog.lastSequence(id!), completedAt: null },
        });
      }
    }
    return json({ message: `unhandled ${method} ${path}` }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);
  return { getRunId: () => runId, eventLog };
}

describe('student web flow (80℃ path)', () => {
  beforeEach(() => {
    localStorage.clear();
    installFakeServer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('catalog → create → run → high-temperature branch → completed with persisted trail', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    // 目录页
    const startButton = await screen.findByText('开始实验');
    fireEvent.click(startButton);

    // START 节点
    fireEvent.click(await screen.findByText('进入实验'));

    // VARIABLE_INPUT：拖到 80℃ 并确认
    const slider = await screen.findByLabelText('温度');
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.click(screen.getByText('确认'));
    fireEvent.click(await screen.findByText('继续'));

    // CONDITION → 高温分支
    fireEvent.click(await screen.findByText('查看结果'));
    expect(await screen.findByText('高温导致酶变性失活')).toBeInTheDocument();
    fireEvent.click(screen.getByText('继续'));

    // OBSERVATION
    const textarea = await screen.findByLabelText('观察结果');
    fireEvent.change(textarea, { target: { value: '没有气泡产生' } });
    fireEvent.click(screen.getByText('提交观察'));
    fireEvent.click(await screen.findByText('继续'));

    // END：变性结局 + 得分 10
    expect(await screen.findByText('实验完成')).toBeInTheDocument();
    expect(screen.getByText(/DENATURED/)).toBeInTheDocument();
    expect(screen.getByText('得分：10')).toBeInTheDocument();

    // 轨迹面板包含关键事件
    await waitFor(() => {
      expect(screen.getAllByText('变量变化').length).toBeGreaterThan(0);
      expect(screen.getAllByText('规则生效').length).toBeGreaterThan(0);
      expect(screen.getAllByText('提交观察').length).toBeGreaterThan(0);
    });

    // 复盘页
    fireEvent.click(screen.getByText('查看实验复盘'));
    expect(await screen.findByText('实验复盘')).toBeInTheDocument();
    expect(screen.getAllByText('完成实验').length).toBeGreaterThan(0);
  });
});
