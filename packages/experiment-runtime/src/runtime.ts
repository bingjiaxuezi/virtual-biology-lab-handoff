/** 跨平台 UUID：浏览器/Node ≥19 都有 globalThis.crypto.randomUUID。 */
function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}
import { type CapabilityRegistry, defaultRegistry } from '@virtual-biology-lab/capability-registry';
import type {
  EventLog,
  ExperimentEvent,
  ExperimentEventType,
  RunState,
} from '@virtual-biology-lab/experiment-events';
import type {
  ExperimentDefinition,
  ExperimentVariable,
} from '@virtual-biology-lab/experiment-schema';
import { experimentDefinitionSchema } from '@virtual-biology-lab/experiment-schema';
import { validateExperiment } from '@virtual-biology-lab/experiment-validator';
import { type Actor, createActor } from 'xstate';
import { type MachineContext, compileMachine } from './machine.js';
import { buildInitialState, evaluateRules } from './rules.js';
import type {
  DispatchResult,
  RunSnapshot,
  RunStatus,
  RunView,
  RuntimeCommand,
  StartRunResult,
} from './types.js';

interface RunRecord {
  definition: ExperimentDefinition;
  actor: Actor<ReturnType<typeof compileMachine>>;
  runId: string;
  experimentVersionId: string;
  studentId: string;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
}

export interface ExperimentRuntime {
  startRun(input: {
    definition: unknown;
    experimentVersionId: string;
    studentId: string;
    runId?: string;
  }): StartRunResult;
  start(runId: string): Promise<DispatchResult>;
  dispatch(runId: string, command: RuntimeCommand): Promise<DispatchResult>;
  abort(runId: string): void;
  getRun(runId: string): RunView | undefined;
  snapshot(runId: string): Promise<RunSnapshot | undefined>;
  restore(snapshot: RunSnapshot, definition: unknown): StartRunResult;
  recordAIEvent(
    runId: string,
    type: Extract<
      ExperimentEventType,
      | 'AI_BRIEFING_VIEWED'
      | 'AI_HINT_REQUESTED'
      | 'AI_HINT_SHOWN'
      | 'AI_OBSERVATION_ASSISTED'
      | 'AI_REVIEW_GENERATED'
    >,
    payload?: Record<string, unknown>,
  ): Promise<ExperimentEvent | undefined>;
}

function now(): string {
  return new Date().toISOString();
}

function validateVariableValue(
  variable: ExperimentVariable,
  value: number | string | boolean,
): string | null {
  switch (variable.type) {
    case 'NUMBER':
      if (typeof value !== 'number') return `Variable "${variable.id}" expects a number`;
      if (value < variable.min || value > variable.max) {
        return `Variable "${variable.id}" must be between ${variable.min} and ${variable.max}`;
      }
      return null;
    case 'ENUM':
      if (typeof value !== 'string' || !variable.options.includes(value)) {
        return `Variable "${variable.id}" expects one of: ${variable.options.join(', ')}`;
      }
      return null;
    case 'BOOLEAN':
      if (typeof value !== 'boolean') return `Variable "${variable.id}" expects a boolean`;
      return null;
  }
}

export function createExperimentRuntime(options: {
  eventLog: EventLog;
  registry?: CapabilityRegistry;
}): ExperimentRuntime {
  const { eventLog } = options;
  const registry = options.registry ?? defaultRegistry;
  const runs = new Map<string, RunRecord>();

  function currentContext(record: RunRecord): MachineContext {
    return record.actor.getSnapshot().context;
  }

  function currentNodeId(record: RunRecord): string {
    return String(record.actor.getSnapshot().value);
  }

  function toView(record: RunRecord): RunView {
    const view: RunView = {
      runId: record.runId,
      experimentVersionId: record.experimentVersionId,
      studentId: record.studentId,
      status: record.status,
      currentNodeId: currentNodeId(record),
      state: currentContext(record),
      startedAt: record.startedAt,
    };
    if (record.completedAt !== undefined) view.completedAt = record.completedAt;
    return view;
  }

  function emit(
    record: RunRecord,
    type: ExperimentEventType,
    payload: Record<string, unknown>,
    nodeId?: string,
    stateBefore?: RunState,
    stateAfter?: RunState,
  ): Promise<ExperimentEvent> {
    return eventLog.append({
      runId: record.runId,
      type,
      payload,
      timestamp: now(),
      ...(nodeId !== undefined ? { nodeId } : {}),
      ...(stateBefore !== undefined ? { stateBefore } : {}),
      ...(stateAfter !== undefined ? { stateAfter } : {}),
    });
  }

  function fail(reason: string): DispatchResult {
    return { ok: false, reason };
  }

  function getRunning(runId: string): RunRecord | DispatchResult {
    const record = runs.get(runId);
    if (!record) return fail(`Run "${runId}" does not exist`);
    if (record.status !== 'RUNNING') return fail(`Run "${runId}" is ${record.status}, not RUNNING`);
    return record;
  }

  function isRecord(value: RunRecord | DispatchResult): value is RunRecord {
    return 'actor' in value;
  }

  function parseDefinition(input: unknown) {
    const validation = validateExperiment(input, registry);
    if (!validation.valid) return { ok: false as const, issues: validation.issues };
    return { ok: true as const, definition: experimentDefinitionSchema.parse(input) };
  }

  function createRecord(
    definition: ExperimentDefinition,
    input: { experimentVersionId: string; studentId: string; runId?: string },
    initial: {
      status: RunStatus;
      context: MachineContext;
      startedAt: string;
      completedAt?: string;
    },
  ): RunRecord {
    const machine = compileMachine(definition);
    const actor = createActor(machine, { input: { context: initial.context } });
    actor.start();
    const record: RunRecord = {
      definition,
      actor,
      runId: input.runId ?? randomUUID(),
      experimentVersionId: input.experimentVersionId,
      studentId: input.studentId,
      status: initial.status,
      startedAt: initial.startedAt,
      ...(initial.completedAt !== undefined ? { completedAt: initial.completedAt } : {}),
    };
    runs.set(record.runId, record);
    return record;
  }

  async function handleSetVariable(
    record: RunRecord,
    command: Extract<RuntimeCommand, { type: 'SET_VARIABLE' }>,
  ): Promise<DispatchResult> {
    const node = record.definition.nodes.find((n) => n.id === currentNodeId(record));
    if (node?.type !== 'VARIABLE_INPUT' || node.config.variableId !== command.variableId) {
      return fail(
        `SET_VARIABLE for "${command.variableId}" is only allowed at its VARIABLE_INPUT node`,
      );
    }
    const variable = record.definition.variables.find((v) => v.id === command.variableId);
    if (!variable) return fail(`Variable "${command.variableId}" is not defined`);
    const valueError = validateVariableValue(variable, command.value);
    if (valueError) return fail(valueError);

    const stateBefore = currentContext(record);
    const previous = stateBefore.variables[command.variableId];
    const events: ExperimentEvent[] = [];

    const afterSet: RunState = {
      variables: { ...stateBefore.variables, [command.variableId]: command.value },
      score: stateBefore.score,
    };
    events.push(
      await emit(
        record,
        'VARIABLE_CHANGED',
        { variableId: command.variableId, from: previous, to: command.value },
        node.id,
        stateBefore,
        afterSet,
      ),
    );

    const { state: finalState, steps } = evaluateRules(record.definition, afterSet);
    for (const step of steps) {
      events.push(
        await emit(
          record,
          'RULE_APPLIED',
          {
            ruleId: step.rule.id,
            effects: step.rule.effects,
            variableChanges: step.variableChanges,
            scoreDelta: step.scoreDelta,
          },
          node.id,
        ),
      );
      for (const change of step.variableChanges) {
        events.push(
          await emit(
            record,
            'VARIABLE_CHANGED',
            { variableId: change.variableId, from: change.from, to: change.to, source: 'RULE' },
            node.id,
          ),
        );
      }
    }

    record.actor.send({ type: 'SYNC_CONTEXT', context: finalState });
    return { ok: true, events };
  }

  async function handleAdvance(record: RunRecord): Promise<DispatchResult> {
    const beforeNode = currentNodeId(record);
    record.actor.send({ type: 'ADVANCE' });
    const afterNode = currentNodeId(record);
    if (afterNode === beforeNode) {
      return fail(`No available transition from node "${beforeNode}"`);
    }
    const transition = record.definition.transitions.find(
      (t) => t.from === beforeNode && t.to === afterNode,
    );
    const events: ExperimentEvent[] = [
      await emit(record, 'TRANSITION_TAKEN', {
        transitionId: transition?.id,
        from: beforeNode,
        to: afterNode,
      }),
      await emit(record, 'NODE_ENTERED', {}, afterNode),
    ];

    const targetNode = record.definition.nodes.find((n) => n.id === afterNode);
    if (targetNode?.type === 'END') {
      record.status = 'COMPLETED';
      record.completedAt = now();
      events.push(
        await emit(
          record,
          'RUN_COMPLETED',
          { outcome: targetNode.config?.outcome, finalState: currentContext(record) },
          afterNode,
        ),
      );
    }
    return { ok: true, events };
  }

  return {
    startRun(input) {
      const parsed = parseDefinition(input.definition);
      if (!parsed.ok) return { ok: false, issues: parsed.issues };
      const record = createRecord(parsed.definition, input, {
        status: 'CREATED',
        context: buildInitialState(parsed.definition),
        startedAt: now(),
      });
      return { ok: true, run: toView(record) };
    },

    async start(runId) {
      const record = runs.get(runId);
      if (!record) return fail(`Run "${runId}" does not exist`);
      if (record.status !== 'CREATED')
        return fail(`Run "${runId}" is ${record.status}, not CREATED`);
      record.status = 'RUNNING';
      const startNodeId = currentNodeId(record);
      const events = [
        await emit(record, 'RUN_STARTED', {
          experimentVersionId: record.experimentVersionId,
          studentId: record.studentId,
        }),
        await emit(record, 'NODE_ENTERED', {}, startNodeId),
      ];
      return { ok: true, events };
    },

    async dispatch(runId, command) {
      const recordOrFailure = getRunning(runId);
      if (!isRecord(recordOrFailure)) return recordOrFailure;
      const record = recordOrFailure;
      const node = record.definition.nodes.find((n) => n.id === currentNodeId(record));

      switch (command.type) {
        case 'SET_VARIABLE':
          return handleSetVariable(record, command);
        case 'PERFORM_ACTION': {
          if (node?.type !== 'ACTION') {
            return fail('PERFORM_ACTION is only allowed at an ACTION node');
          }
          return {
            ok: true,
            events: [
              await emit(
                record,
                'ACTION_PERFORMED',
                { actionKind: node.config.actionKind },
                node.id,
              ),
            ],
          };
        }
        case 'SUBMIT_OBSERVATION': {
          if (node?.type !== 'OBSERVATION') {
            return fail('SUBMIT_OBSERVATION is only allowed at an OBSERVATION node');
          }
          if (!command.text.trim()) return fail('Observation text must not be empty');
          return {
            ok: true,
            events: [await emit(record, 'OBSERVATION_SUBMITTED', { text: command.text }, node.id)],
          };
        }
        case 'ANSWER_QUESTION': {
          if (node?.type !== 'QUESTION') {
            return fail('ANSWER_QUESTION is only allowed at a QUESTION node');
          }
          if (!command.answer.trim()) return fail('Answer must not be empty');
          return {
            ok: true,
            events: [await emit(record, 'QUESTION_ANSWERED', { answer: command.answer }, node.id)],
          };
        }
        case 'ADVANCE':
          return handleAdvance(record);
        default:
          return fail(`Unknown command type "${String((command as { type: unknown }).type)}"`);
      }
    },

    abort(runId) {
      const record = runs.get(runId);
      if (record && (record.status === 'CREATED' || record.status === 'RUNNING')) {
        record.status = 'ABORTED';
      }
    },

    getRun(runId) {
      const record = runs.get(runId);
      return record ? toView(record) : undefined;
    },

    async snapshot(runId) {
      const record = runs.get(runId);
      if (!record) return undefined;
      const snapshot: RunSnapshot = {
        runId: record.runId,
        experimentVersionId: record.experimentVersionId,
        studentId: record.studentId,
        status: record.status,
        currentNodeId: currentNodeId(record),
        state: currentContext(record),
        lastSequence: await eventLog.lastSequence(runId),
        startedAt: record.startedAt,
      };
      if (record.completedAt !== undefined) snapshot.completedAt = record.completedAt;
      return snapshot;
    },

    restore(snapshot, definition) {
      const parsed = parseDefinition(definition);
      if (!parsed.ok) return { ok: false, issues: parsed.issues };
      const record = createRecord(
        parsed.definition,
        {
          experimentVersionId: snapshot.experimentVersionId,
          studentId: snapshot.studentId,
          runId: snapshot.runId,
        },
        {
          status: snapshot.status,
          context: snapshot.state,
          startedAt: snapshot.startedAt,
          ...(snapshot.completedAt !== undefined ? { completedAt: snapshot.completedAt } : {}),
        },
      );
      record.actor.send({ type: 'RESTORE_TO', nodeId: snapshot.currentNodeId });
      return { ok: true, run: toView(record) };
    },

    async recordAIEvent(runId, type, payload = {}) {
      const record = runs.get(runId);
      if (!record) return undefined;
      return emit(record, type, payload, currentNodeId(record));
    },
  };
}
