import type { ExperimentEvent, RunState } from '@virtual-biology-lab/experiment-events';
import type { ValidationIssue } from '@virtual-biology-lab/experiment-validator';

export const RUN_STATUSES = ['CREATED', 'RUNNING', 'COMPLETED', 'ABORTED'] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export type RuntimeCommand =
  | { type: 'SET_VARIABLE'; variableId: string; value: number | string | boolean }
  | { type: 'PERFORM_ACTION' }
  | { type: 'SUBMIT_OBSERVATION'; text: string }
  | { type: 'ANSWER_QUESTION'; answer: string }
  | { type: 'ADVANCE' }
  | { type: 'BACK' };

export const RUNTIME_COMMAND_TYPES = [
  'SET_VARIABLE',
  'PERFORM_ACTION',
  'SUBMIT_OBSERVATION',
  'ANSWER_QUESTION',
  'ADVANCE',
  'BACK',
] as const;

export interface RunView {
  runId: string;
  experimentVersionId: string;
  studentId: string;
  status: RunStatus;
  currentNodeId: string;
  state: RunState;
  startedAt: string;
  completedAt?: string;
}

export interface RunSnapshot {
  runId: string;
  experimentVersionId: string;
  studentId: string;
  status: RunStatus;
  currentNodeId: string;
  state: RunState;
  lastSequence: number;
  startedAt: string;
  completedAt?: string;
}

export type StartRunResult = { ok: true; run: RunView } | { ok: false; issues: ValidationIssue[] };

export type DispatchResult =
  | { ok: true; events: ExperimentEvent[] }
  | { ok: false; reason: string };
