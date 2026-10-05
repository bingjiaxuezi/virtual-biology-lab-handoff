/**
 * 战争迷雾流程图测试：迷雾占位与防泄露、探索解锁、点击读档跳转、背包与抽屉。
 * 复用内存版后端模式（与 flow.test.tsx 相同）。
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

/** 流程图容器内的查询器。 */
function mapScope() {
  return within(screen.getByLabelText('实验流程图'));
}

describe('战争迷雾流程图', () => {
  beforeEach(() => {
    localStorage.clear();
    installFakeServer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('迷雾占位：未访问节点只显示类型与 ???，DOM 不含真实标题；探索后解锁', async () => {
    await enterRun();

    const map = mapScope();
    // 8 节点：当前「开始」可见（类型徽标 + 标题两处），其余 7 个迷雾占位
    expect(map.getAllByText('开始').length).toBeGreaterThanOrEqual(1);
    expect(map.getAllByText('???')).toHaveLength(7);
    expect(map.queryByText('设置实验温度')).toBeNull();
    expect(map.queryByText('记录实验现象')).toBeNull();
    expect(screen.getByText('已探索 1/8')).toBeInTheDocument();

    // 推进：设置温度节点解锁
    fireEvent.click(screen.getByText('进入实验'));
    await waitFor(() => {
      expect(map.getByText('设置实验温度')).toBeInTheDocument();
    });
    expect(map.getAllByText('???')).toHaveLength(6);
    expect(screen.getByText('已探索 2/8')).toBeInTheDocument();
  });

  it('点击已访问节点读档跳转；迷雾节点不可点', async () => {
    await enterRun();
    fireEvent.click(screen.getByText('进入实验'));
    const map = mapScope();
    await waitFor(() => {
      expect(map.getByText('设置实验温度')).toBeInTheDocument();
    });

    // 迷雾节点点击无效果（无任何命令，仍在变量节点）
    fireEvent.click(map.getAllByText('???')[0]!);
    expect(screen.queryByText('进入实验')).toBeNull();

    // 点击已访问的「开始」节点 → JUMP_TO 回到起点（徽标与标题同名，取其一）
    fireEvent.click(map.getAllByText('开始')[0]!);
    await waitFor(() => {
      expect(screen.getByText('进入实验')).toBeInTheDocument();
    });
    expect(screen.getByText('已探索 2/8')).toBeInTheDocument();
  });

  it('背包聚合记录；移动端抽屉开合', async () => {
    await enterRun();

    // 背包默认空态
    expect(screen.getByText('背包还是空的')).toBeInTheDocument();

    // 设置 80℃ 触发规则 → 2 条变量记录
    fireEvent.click(screen.getByText('进入实验'));
    const slider = await screen.findByLabelText('温度');
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.click(screen.getByText('确认'));
    await waitFor(() => {
      expect(screen.getByText('温度（temperature）')).toBeInTheDocument();
    });
    expect(screen.getByText(/→ 80/)).toBeInTheDocument();
    expect(screen.getByText('样本状态（sampleStatus）')).toBeInTheDocument();

    // 抽屉开合（≤800px 时可见的横条按钮，jsdom 中始终在 DOM）
    const toggle = screen.getByRole('button', { name: /背包 \(\d+\)/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle.closest('aside')).toHaveClass('open');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});
