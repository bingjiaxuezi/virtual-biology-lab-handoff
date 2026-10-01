import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RunStateView } from '../src/api/types';
import { ActionNodeView } from '../src/nodes/ActionNodeView';
import { ConditionNodeView } from '../src/nodes/ConditionNodeView';
import { MediaNodeView } from '../src/nodes/MediaNodeView';
import { ObservationNodeView } from '../src/nodes/ObservationNodeView';
import { QuestionNodeView } from '../src/nodes/QuestionNodeView';
import { StartNodeView } from '../src/nodes/StartNodeView';
import { UnknownNodeView } from '../src/nodes/UnknownNodeView';
import { VariableInputNodeView } from '../src/nodes/VariableInputNodeView';
import { getNodeRenderer } from '../src/nodes/registry';
import { lightDefinition, loadSampleDefinition } from './fixtures';

const definition = loadSampleDefinition();
const state: RunStateView = {
  variables: { temperature: 25, sampleStatus: 'NORMAL' },
  score: 0,
};

function nodeById(id: string) {
  const node = definition.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`node ${id} not in sample definition`);
  return node;
}

function renderNode(component: React.ReactElement) {
  return render(component);
}

describe('node renderers', () => {
  it('START renders title and objectives, advances on click', async () => {
    const onCommand = vi.fn().mockResolvedValue(true);
    renderNode(
      <StartNodeView
        node={nodeById('start')}
        definition={definition}
        state={state}
        busy={false}
        onCommand={onCommand}
      />,
    );
    expect(screen.getByText('温度对酶活性的影响')).toBeInTheDocument();
    fireEvent.click(screen.getByText('进入实验'));
    await vi.waitFor(() => expect(onCommand).toHaveBeenCalledWith({ type: 'ADVANCE' }));
  });

  it('ACTION renders actionKind and emits PERFORM_ACTION then ADVANCE', async () => {
    const onCommand = vi.fn().mockResolvedValue(true);
    renderNode(
      <ActionNodeView
        node={lightDefinition.nodes[0]!}
        definition={lightDefinition}
        state={state}
        busy={false}
        onCommand={onCommand}
      />,
    );
    fireEvent.click(screen.getByText('执行操作'));
    await vi.waitFor(() => expect(onCommand).toHaveBeenCalledWith({ type: 'PERFORM_ACTION' }));
    fireEvent.click(await screen.findByText('继续'));
    await vi.waitFor(() => expect(onCommand).toHaveBeenCalledWith({ type: 'ADVANCE' }));
  });

  it('VARIABLE_INPUT renders slider bound to variable range and emits SET_VARIABLE', async () => {
    const onCommand = vi.fn().mockResolvedValue(true);
    renderNode(
      <VariableInputNodeView
        node={nodeById('set_temp')}
        definition={definition}
        state={state}
        busy={false}
        onCommand={onCommand}
      />,
    );
    const slider = screen.getByLabelText('温度');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    fireEvent.change(slider, { target: { value: '80' } });
    fireEvent.click(screen.getByText('确认'));
    await vi.waitFor(() =>
      expect(onCommand).toHaveBeenCalledWith({
        type: 'SET_VARIABLE',
        variableId: 'temperature',
        value: 80,
      }),
    );
  });

  it('MEDIA renders asset placeholder card with caption', () => {
    const onCommand = vi.fn().mockResolvedValue(true);
    renderNode(
      <MediaNodeView
        node={nodeById('normal_media')}
        definition={definition}
        state={state}
        busy={false}
        onCommand={onCommand}
      />,
    );
    expect(screen.getByText('视频')).toBeInTheDocument();
  });

  it('OBSERVATION submits non-empty text only', async () => {
    const onCommand = vi.fn().mockResolvedValue(true);
    renderNode(
      <ObservationNodeView
        node={nodeById('observe')}
        definition={definition}
        state={state}
        busy={false}
        onCommand={onCommand}
      />,
    );
    const submit = screen.getByText('提交观察');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('观察结果'), { target: { value: '产生大量气泡' } });
    fireEvent.click(submit);
    await vi.waitFor(() =>
      expect(onCommand).toHaveBeenCalledWith({ type: 'SUBMIT_OBSERVATION', text: '产生大量气泡' }),
    );
  });

  it('QUESTION submits the chosen answer', async () => {
    const onCommand = vi.fn().mockResolvedValue(true);
    renderNode(
      <QuestionNodeView
        node={lightDefinition.nodes[1]!}
        definition={lightDefinition}
        state={state}
        busy={false}
        onCommand={onCommand}
      />,
    );
    fireEvent.change(screen.getByLabelText('回答'), { target: { value: '因为高温使酶变性' } });
    fireEvent.click(screen.getByText('提交回答'));
    await vi.waitFor(() =>
      expect(onCommand).toHaveBeenCalledWith({
        type: 'ANSWER_QUESTION',
        answer: '因为高温使酶变性',
      }),
    );
  });

  it('CONDITION shows the humanized condition with current value', () => {
    const onCommand = vi.fn().mockResolvedValue(true);
    renderNode(
      <ConditionNodeView
        node={nodeById('check_temp')}
        definition={definition}
        state={state}
        busy={false}
        onCommand={onCommand}
      />,
    );
    expect(screen.getByText(/判断条件/)).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('unknown node type falls back to a placeholder instead of crashing', () => {
    const Unknown = getNodeRenderer('HOLOGRAM');
    expect(Unknown).toBe(UnknownNodeView);
    renderNode(
      <Unknown
        node={{ id: 'x', type: 'HOLOGRAM' } as never}
        definition={definition}
        state={state}
        busy={false}
        onCommand={vi.fn()}
      />,
    );
    expect(screen.getByText('暂不支持')).toBeInTheDocument();
  });
});
