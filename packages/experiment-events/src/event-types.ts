import { z } from 'zod';

/** Iteration 1 核心事件类型（见 docs/domain/runtime-event-model.md）。 */
export const experimentEventTypeSchema = z.enum([
  'RUN_STARTED',
  'NODE_ENTERED',
  'ACTION_PERFORMED',
  'VARIABLE_CHANGED',
  'OBSERVATION_SUBMITTED',
  'QUESTION_ANSWERED',
  'RULE_APPLIED',
  'TRANSITION_TAKEN',
  'AI_BRIEFING_VIEWED',
  'AI_HINT_REQUESTED',
  'AI_HINT_SHOWN',
  'AI_OBSERVATION_ASSISTED',
  'AI_REVIEW_GENERATED',
  'RUN_COMPLETED',
]);
export type ExperimentEventType = z.infer<typeof experimentEventTypeSchema>;

export const EXPERIMENT_EVENT_TYPES = experimentEventTypeSchema.options;

/** 可变状态快照（变量值 + 总分），用于 stateBefore/stateAfter。 */
export const runStateSchema = z.object({
  variables: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  score: z.number(),
});
export type RunState = z.infer<typeof runStateSchema>;

export const experimentEventSchema = z.object({
  eventId: z.string().min(1),
  runId: z.string().min(1),
  sequence: z.number().int().positive(),
  type: experimentEventTypeSchema,
  nodeId: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string().min(1),
  stateBefore: runStateSchema.optional(),
  stateAfter: runStateSchema.optional(),
});
export type ExperimentEvent = z.infer<typeof experimentEventSchema>;

/** 追加事件的输入：eventId 与 sequence 由 EventLog 分配。 */
export const newExperimentEventSchema = experimentEventSchema.omit({
  eventId: true,
  sequence: true,
});
export type NewExperimentEvent = z.infer<typeof newExperimentEventSchema>;
