import { z } from 'zod';
import { mediaTypeSchema } from './assets.js';
import { conditionSchema } from './conditions.js';

export const nodeTypeSchema = z.enum([
  'START',
  'ACTION',
  'VARIABLE_INPUT',
  'MEDIA',
  'OBSERVATION',
  'QUESTION',
  'CONDITION',
  'END',
]);
export type NodeType = z.infer<typeof nodeTypeSchema>;

const nodeBase = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
});

export const startNodeSchema = nodeBase.extend({
  type: z.literal('START'),
});

export const actionNodeSchema = nodeBase.extend({
  type: z.literal('ACTION'),
  config: z.object({
    actionKind: z.string().min(1),
    description: z.string().optional(),
  }),
});

export const variableInputModeSchema = z.enum(['SLIDER', 'NUMBER_INPUT', 'SELECT', 'TOGGLE']);
export type VariableInputMode = z.infer<typeof variableInputModeSchema>;

export const variableInputNodeSchema = nodeBase.extend({
  type: z.literal('VARIABLE_INPUT'),
  config: z.object({
    variableId: z.string().min(1),
    inputMode: variableInputModeSchema,
  }),
});

export const mediaNodeSchema = nodeBase.extend({
  type: z.literal('MEDIA'),
  config: z.object({
    assetId: z.string().min(1),
    mediaType: mediaTypeSchema,
    caption: z.string().optional(),
  }),
});

export const observationNodeSchema = nodeBase.extend({
  type: z.literal('OBSERVATION'),
  config: z.object({
    prompt: z.string().min(1),
    placeholder: z.string().optional(),
  }),
});

export const questionNodeSchema = nodeBase.extend({
  type: z.literal('QUESTION'),
  config: z.object({
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).optional(),
  }),
});

/** CONDITION 仅用于显示/表达条件判断；真正的流程跳转由 Transition condition 控制。 */
export const conditionNodeSchema = nodeBase.extend({
  type: z.literal('CONDITION'),
  config: z.object({
    condition: conditionSchema,
  }),
});

export const endNodeSchema = nodeBase.extend({
  type: z.literal('END'),
  config: z
    .object({
      outcome: z.string().min(1).optional(),
    })
    .optional(),
});

export const experimentNodeSchema = z.discriminatedUnion('type', [
  startNodeSchema,
  actionNodeSchema,
  variableInputNodeSchema,
  mediaNodeSchema,
  observationNodeSchema,
  questionNodeSchema,
  conditionNodeSchema,
  endNodeSchema,
]);

export type StartNode = z.infer<typeof startNodeSchema>;
export type ActionNode = z.infer<typeof actionNodeSchema>;
export type VariableInputNode = z.infer<typeof variableInputNodeSchema>;
export type MediaNode = z.infer<typeof mediaNodeSchema>;
export type ObservationNode = z.infer<typeof observationNodeSchema>;
export type QuestionNode = z.infer<typeof questionNodeSchema>;
export type ConditionNode = z.infer<typeof conditionNodeSchema>;
export type EndNode = z.infer<typeof endNodeSchema>;
export type ExperimentNode = z.infer<typeof experimentNodeSchema>;
