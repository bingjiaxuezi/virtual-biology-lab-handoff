import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CopilotPanel } from '../src/copilot/CopilotPanel';

vi.mock('../src/api/client', () => ({
  api: {
    aiGenerate: vi.fn(),
    aiChange: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  },
}));

import { api } from '../src/api/client';

const proposalDefinition = {
  schemaVersion: '0.1',
  id: 'exp-ai',
  version: 1,
  metadata: { title: 'AI 生成的实验' },
  teaching: { objectives: ['目标'] },
  variables: [],
  assets: [],
  nodes: [
    { id: 'start', type: 'START' },
    { id: 'end', type: 'END', config: { outcome: '完成' } },
  ],
  transitions: [{ id: 't1', from: 'start', to: 'end' }],
  rules: [],
  assessment: {
    initialScore: 0,
    completion: { type: 'REACH_END' },
    summary: { showScore: true, showKeyEvents: true },
  },
  aiPolicy: {
    briefing: { enabled: false },
    tutor: {
      enabled: false,
      hintLevel: 'STANDARD',
      allowExplainTheory: true,
      allowPointOutWrongDirection: true,
      revealAnswer: false,
    },
    observationAssist: { enabled: false },
    review: { enabled: false },
  },
};

describe('CopilotPanel', () => {
  beforeEach(() => {
    vi.mocked(api.aiGenerate).mockReset();
    vi.mocked(api.aiChange).mockReset();
  });

  it('生成 → 展示摘要 → 应用到草稿回调 definition', async () => {
    vi.mocked(api.aiGenerate).mockResolvedValue({
      definition: proposalDefinition,
      issues: [],
      needsReview: false,
      provider: 'mock',
    });
    const onApply = vi.fn();
    render(<CopilotPanel experimentId="exp1" onApply={onApply} onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/生成一个探究/), {
      target: { value: '光合作用实验' },
    });
    fireEvent.click(screen.getByText('生成草案'));

    expect(await screen.findByText('校验通过')).toBeInTheDocument();
    expect(api.aiGenerate).toHaveBeenCalledWith('exp1', '光合作用实验');

    fireEvent.click(screen.getByText('应用到草稿'));
    expect(onApply).toHaveBeenCalledWith(proposalDefinition);
  });

  it('修改模式带摘要；丢弃后提案消失且未应用', async () => {
    vi.mocked(api.aiChange).mockResolvedValue({
      definition: proposalDefinition,
      issues: [],
      needsReview: false,
      provider: 'mock',
      summary: ['新增节点 q1（QUESTION）'],
    });
    const onApply = vi.fn();
    render(<CopilotPanel experimentId="exp1" onApply={onApply} onClose={() => {}} />);

    fireEvent.click(screen.getByText('修改当前草稿'));
    fireEvent.change(screen.getByPlaceholderText(/把温度上限/), {
      target: { value: '增加提问' },
    });
    fireEvent.click(screen.getByText('生成修改提案'));

    expect(await screen.findByText('变更摘要（服务端生成）')).toBeInTheDocument();
    expect(screen.getByText('新增节点 q1（QUESTION）')).toBeInTheDocument();

    fireEvent.click(screen.getByText('丢弃'));
    await waitFor(() => {
      expect(screen.queryByText('变更摘要（服务端生成）')).not.toBeInTheDocument();
    });
    expect(onApply).not.toHaveBeenCalled();
  });

  it('needsReview 时展示 error 数，结构不可解析则禁用应用', async () => {
    vi.mocked(api.aiGenerate).mockResolvedValue({
      definition: { not: 'a definition' },
      issues: [
        { code: 'SCHEMA_INVALID', path: '', message: '结构不可解析', severity: 'error' as const },
      ],
      needsReview: true,
      provider: 'mock',
    });
    render(<CopilotPanel experimentId="exp1" onApply={() => {}} onClose={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/生成一个探究/), { target: { value: 'x' } });
    fireEvent.click(screen.getByText('生成草案'));

    expect(await screen.findByText(/needsReview/)).toBeInTheDocument();
    expect(screen.getByText('应用到草稿')).toBeDisabled();
    expect(screen.getByText(/结构不可解析，无法应用或试玩/)).toBeInTheDocument();
  });
});
