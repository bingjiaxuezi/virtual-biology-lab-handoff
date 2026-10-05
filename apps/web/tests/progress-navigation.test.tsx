/**
 * 进度导航包测试：里程碑进度条三态、轨迹跳转读档、背包聚合。
 * 复用 flow.test.tsx 的内存版后端模式。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InMemoryEventLog } from '@virtual-biology-lab/experiment-events';
import { createExperimentRuntime } from '@virtual-biology-lab/experiment-runtime';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { loadSampleDefinition } from './fixtures';

const definition: Record<string, unknown> = loadSampleDefinition();

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
}

/** 目录 → 建 run → 停留在 START 节点。 */
async function enterRun() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByText('开始实验'));
  await screen.findByText('进入实验');
}

describe('进度导航包', () => {
  beforeEach(() => {
    localStorage.clear();
    installFakeServer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('里程碑进度条：起点高亮，刻度计数随推进增长', async () => {
    await enterRun();

    // 最长主路径 6 个里程碑：开始/设置温度/判断/媒体/观察/结束
    expect(await screen.findByLabelText('实验进度')).toBeInTheDocument();
    expect(screen.getByText('1/6')).toBeInTheDocument();
    expect(screen.getByTitle('设置实验温度')).toHaveClass('todo');

    // 推进到设置温度
    fireEvent.click(await screen.findByText('进入实验'));
    expect(await screen.findByText('2/6')).toBeInTheDocument();
    expect(screen.getByTitle('设置实验温度')).toHaveClass('current');
    expect(screen.getByTitle('开始')).toHaveClass('done');
  });

  it('事件轨迹：显示节点标题摘要，点击历史条目读档跳转', async () => {
    await enterRun();
    fireEvent.click(await screen.findByText('进入实验'));

    // 设置 80℃ 后继续到判断节点
    const slider = await screen.findByLabelText('温度');
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.click(screen.getByText('确认'));
    fireEvent.click(await screen.findByText('继续'));
    expect(await screen.findByText('查看结果')).toBeInTheDocument();

    // 轨迹出现可读摘要而非内部 ID
    await waitFor(() => {
      expect(screen.getAllByText('进入「开始」').length).toBeGreaterThan(0);
      expect(screen.getAllByText('温度（temperature） → 80').length).toBeGreaterThan(0);
    });
    expect(screen.queryByText('check_temp')).toBeNull();

    // 点击历史「进入 开始」→ JUMP_TO 回到 start 节点
    fireEvent.click(screen.getAllByText('进入「开始」')[0]!);
    await waitFor(() => {
      expect(screen.getAllByText(/跳转到「开始」/).length).toBeGreaterThan(0);
    });
    // 回到 START 节点：主按钮回到「进入实验」
    expect(await screen.findByText('进入实验')).toBeInTheDocument();
  });

  it('背包：聚合观察/问答/关键变量记录，空时空态', async () => {
    await enterRun();

    // 默认在轨迹页签，背包页签角标为 0
    fireEvent.click(screen.getByRole('tab', { name: /背包/ }));
    expect(await screen.findByText('背包还是空的')).toBeInTheDocument();

    // 切回轨迹并推进产生记录
    fireEvent.click(screen.getByRole('tab', { name: /轨迹/ }));
    fireEvent.click(await screen.findByText('进入实验'));
    const slider = await screen.findByLabelText('温度');
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.click(screen.getByText('确认'));

    // 设置 80°C 同时触发规则改变样本状态 → 2 条变量记录
    fireEvent.click(await screen.findByRole('tab', { name: /背包 \(2\)/ }));
    expect(await screen.findByText(/关键操作（2）/)).toBeInTheDocument();
    expect(screen.getByText('温度（temperature）')).toBeInTheDocument();
    expect(screen.getByText(/→ 80/)).toBeInTheDocument();
    expect(screen.getByText('样本状态（sampleStatus）')).toBeInTheDocument();
  });

  it('侧栏：抽屉开合与页签切换', async () => {
    await enterRun();

    // 抽屉默认收起，点击后展开（class + aria-expanded 同步）
    const toggle = screen.getByRole('button', { name: /轨迹 \d+ · 背包 \d+/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.closest('aside')).toHaveClass('open');

    // 页签切换到背包再切回轨迹
    fireEvent.click(screen.getByRole('tab', { name: /背包/ }));
    expect(screen.getByRole('tab', { name: /背包/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: /轨迹/ }));
    expect(screen.getByRole('tab', { name: /轨迹/ })).toHaveAttribute('aria-selected', 'true');

    // 再点一次收起
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.closest('aside')).not.toHaveClass('open');
  });
});
