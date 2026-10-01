import type { RunState } from '@virtual-biology-lab/experiment-events';
import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import { assign, setup } from 'xstate';
import { evaluateCondition } from './conditions.js';

export type MachineContext = RunState;

export type MachineEvent =
  | { type: 'ADVANCE' }
  | { type: 'SYNC_CONTEXT'; context: MachineContext }
  | { type: 'RESTORE_TO'; nodeId: string };

/**
 * 将 Experiment Definition 编译为 XState v5 machine：
 * 节点 → state（END 为 final），Transition → 带 guard 的 edge（按 priority 降序），
 * Run State 放在 context。machine 只负责流程执行，不作为持久化模型。
 */
export function compileMachine(definition: ExperimentDefinition) {
  const startNode = definition.nodes.find((node) => node.type === 'START');
  if (!startNode) {
    throw new Error('Cannot compile machine: definition has no START node');
  }

  const variableDefs = new Map(definition.variables.map((variable) => [variable.id, variable]));

  const guards: Record<string, ({ context }: { context: MachineContext }) => boolean> = {};
  for (const transition of definition.transitions) {
    if (transition.condition) {
      const condition = transition.condition;
      guards[`cond_${transition.id}`] = ({ context }) =>
        evaluateCondition(condition, context.variables, variableDefs);
    }
  }

  const states: Record<string, unknown> = {};
  for (const node of definition.nodes) {
    if (node.type === 'END') {
      states[node.id] = { type: 'final' };
      continue;
    }
    const outgoing = definition.transitions
      .filter((transition) => transition.from === node.id)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    states[node.id] = {
      on: {
        ADVANCE: outgoing.map((transition) =>
          transition.condition
            ? { guard: `cond_${transition.id}`, target: transition.to }
            : { target: transition.to },
        ),
      },
    };
  }

  return setup({
    types: {
      context: {} as MachineContext,
      events: {} as MachineEvent,
      input: {} as { context: MachineContext },
    },
    guards,
  }).createMachine({
    id: definition.id,
    initial: startNode.id,
    context: ({ input }) => input.context,
    states: states as never,
    on: {
      SYNC_CONTEXT: {
        actions: assign(({ event }) => {
          if (event.type !== 'SYNC_CONTEXT') return {};
          return { variables: event.context.variables, score: event.context.score };
        }),
      },
      RESTORE_TO: definition.nodes.map((node) => ({
        guard: ({ event }: { event: MachineEvent }) =>
          event.type === 'RESTORE_TO' && event.nodeId === node.id,
        target: `.${node.id}`,
      })) as never,
    },
  });
}
