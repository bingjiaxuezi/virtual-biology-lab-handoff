import type { ExperimentDefinition } from '@virtual-biology-lab/experiment-schema';
import type { ValidationIssue } from '@virtual-biology-lab/experiment-validator';

export interface VersionSummary {
  id: string;
  version: number;
  publishedAt: string;
}

export interface ExperimentRecord {
  id: string;
  title: string;
  draft: unknown;
  createdAt: string;
  updatedAt: string;
  versions: VersionSummary[];
}

export interface DraftSaveResult {
  experiment: ExperimentRecord;
  warnings: ValidationIssue[];
}

export interface PublishResult {
  version: VersionSummary & { experimentId: string; definition: unknown };
  warnings: ValidationIssue[];
}

export interface AiProposal {
  definition: unknown;
  issues: ValidationIssue[];
  needsReview: boolean;
  provider: string;
  summary?: string[];
}

export interface RunSummary {
  runId: string;
  version: number;
  studentId: string;
  status: string;
  score: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface TrailEvent {
  id: string;
  sequence: number;
  type: string;
  nodeId: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type { ExperimentDefinition, ValidationIssue };
