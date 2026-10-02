import { fireEvent, render, screen } from '@testing-library/react';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/api/client', () => ({
  api: {
    aiBriefing: vi.fn(),
    aiHint: vi.fn(),
    aiObservationAssist: vi.fn(),
    aiReview: vi.fn(),
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
import { AiAssistant } from '../src/components/AiAssistant';
import { ObservationNodeView } from '../src/nodes/ObservationNodeView';

function makeDefinition(aiPolicy: Partial<ExperimentDefinition['aiPolicy']>): ExperimentDefinition {
  return {
    schemaVersion: '0.1',
    id: 'exp-test',
    version: 1,
    metadata: { title: '测试实验' },
    teaching: { objectives: ['目标'] },
    variables: [],
    assets: [],
    nodes: [
      { id: 'start', type: 'START' },
      { id: 'end', type: 'END' },
    ],
    transitions: [],
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
      ...aiPolicy,
    },
  } as ExperimentDefinition;
}

const startNode = { id: 'start', type: 'START' } as const;
const observationNode = {
  id: 'observe',
  type: 'OBSERVATION',
  config: { prompt: '描述现象' },
} as const;

describe('AiAssistant 入口显隐', () => {
  beforeEach(() => {
    vi.mocked(api.aiBriefing).mockReset();
    vi.mocked(api.aiHint).mockReset();
    vi.mocked(api.aiReview).mockReset();
  });

  it('全部关闭时不渲染任何入口', () => {
    const { container } = render(
      <AiAssistant runId="r1" node={startNode} definition={makeDefinition({})} status="RUNNING" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('briefing 只在 START 节点出现；tutor 开启时有「求助 AI」', () => {
    const definition = makeDefinition({
      briefing: { enabled: true },
      tutor: {
        enabled: true,
        hintLevel: 'STANDARD',
        allowExplainTheory: true,
        allowPointOutWrongDirection: true,
        revealAnswer: false,
      },
    });
    render(<AiAssistant runId="r1" node={startNode} definition={definition} status="RUNNING" />);
    expect(screen.getByText('实验导读')).toBeInTheDocument();
    expect(screen.getByText('求助 AI')).toBeInTheDocument();
    expect(screen.queryByText('生成复盘')).not.toBeInTheDocument();
  });

  it('复盘入口仅完成后出现', () => {
    const definition = makeDefinition({ review: { enabled: true } });
    const { rerender } = render(
      <AiAssistant runId="r1" node={startNode} definition={definition} status="RUNNING" />,
    );
    expect(screen.queryByText('生成复盘')).not.toBeInTheDocument();
    rerender(
      <AiAssistant runId="r1" node={startNode} definition={definition} status="COMPLETED" />,
    );
    expect(screen.getByText('生成复盘')).toBeInTheDocument();
  });

  it('点击「求助 AI」展示返回文本', async () => {
    vi.mocked(api.aiHint).mockResolvedValue({ text: '【提示】想想哪个变量关键' });
    const definition = makeDefinition({
      tutor: {
        enabled: true,
        hintLevel: 'STANDARD',
        allowExplainTheory: true,
        allowPointOutWrongDirection: true,
        revealAnswer: false,
      },
    });
    render(<AiAssistant runId="r1" node={startNode} definition={definition} status="RUNNING" />);
    fireEvent.click(screen.getByText('求助 AI'));
    expect(await screen.findByText('【提示】想想哪个变量关键')).toBeInTheDocument();
    expect(api.aiHint).toHaveBeenCalledWith('r1');
  });
});

describe('ObservationNodeView 观察助手', () => {
  beforeEach(() => {
    vi.mocked(api.aiObservationAssist).mockReset();
  });

  const baseProps = {
    node: observationNode,
    definition: makeDefinition({}),
    state: { variables: {}, score: 0 },
    busy: false,
    step: 2,
    back: { canBack: true, onBack: vi.fn() },
  };

  it('开关关闭时无 AI 按钮', () => {
    render(
      <ObservationNodeView
        {...baseProps}
        onCommand={vi.fn()}
        ai={{ runId: 'r1', observationAssistEnabled: false }}
      />,
    );
    expect(screen.queryByText('AI 完善建议')).not.toBeInTheDocument();
  });

  it('采纳建议只填充输入框，不自动提交', async () => {
    vi.mocked(api.aiObservationAssist).mockResolvedValue({
      suggestion: '观察到气泡细密且持续',
    });
    const onCommand = vi.fn().mockResolvedValue(true);
    render(
      <ObservationNodeView
        {...baseProps}
        onCommand={onCommand}
        ai={{ runId: 'r1', observationAssistEnabled: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText('观察结果'), { target: { value: '有气泡' } });
    fireEvent.click(screen.getByText('AI 完善建议'));
    expect(await screen.findByText('观察到气泡细密且持续')).toBeInTheDocument();
    expect(api.aiObservationAssist).toHaveBeenCalledWith('r1', '有气泡');

    fireEvent.click(screen.getByText('采纳到输入框'));
    // 已有内容时追加建议，不覆盖学生自己的记录
    expect(screen.getByLabelText('观察结果')).toHaveValue('有气泡\n观察到气泡细密且持续');
    // 采纳本身不发出任何命令
    expect(onCommand).not.toHaveBeenCalled();

    // 学生显式提交才发出 SUBMIT_OBSERVATION
    fireEvent.click(screen.getByText('提交观察'));
    expect(onCommand).toHaveBeenCalledWith({
      type: 'SUBMIT_OBSERVATION',
      text: '有气泡\n观察到气泡细密且持续',
    });
  });
});
