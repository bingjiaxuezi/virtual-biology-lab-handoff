import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';

export interface CatalogItem {
  experimentId: string;
  title: string;
  latestVersion: { id: string; version: number; publishedAt: string };
}

export interface PublishedVersion {
  id: string;
  experimentId: string;
  version: number;
  publishedAt: string;
  definition: ExperimentDefinition;
}

export interface RunStateView {
  variables: Record<string, number | string | boolean>;
  score: number;
}

export interface RunView {
  runId: string;
  experimentVersionId: string;
  studentId: string;
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'ABORTED';
  currentNodeId: string;
  state: RunStateView;
  lastSequence: number;
  startedAt: string;
  completedAt: string | null;
}

export interface RunEvent {
  eventId: string;
  runId: string;
  sequence: number;
  type: string;
  nodeId?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type RuntimeCommand =
  | { type: 'SET_VARIABLE'; variableId: string; value: number | string | boolean }
  | { type: 'PERFORM_ACTION' }
  | { type: 'SUBMIT_OBSERVATION'; text: string }
  | { type: 'ANSWER_QUESTION'; answer: string }
  | { type: 'ADVANCE' }
  | { type: 'BACK' }
  | { type: 'JUMP_TO'; nodeId: string };

export type DispatchResult =
  | { ok: true; events: RunEvent[]; run: RunView }
  | { ok: false; reason: string; run: RunView };
