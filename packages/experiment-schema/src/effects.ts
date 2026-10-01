import { z } from 'zod';

export const effectTypeSchema = z.enum(['SET', 'ADD', 'SUBTRACT', 'SCORE']);
export type EffectType = z.infer<typeof effectTypeSchema>;

export const setEffectSchema = z.object({
  type: z.literal('SET'),
  variableId: z.string().min(1),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

export const addEffectSchema = z.object({
  type: z.literal('ADD'),
  variableId: z.string().min(1),
  value: z.number(),
});

export const subtractEffectSchema = z.object({
  type: z.literal('SUBTRACT'),
  variableId: z.string().min(1),
  value: z.number(),
});

/** SCORE 作用于 Assessment 总分，不针对实验变量。 */
export const scoreEffectSchema = z.object({
  type: z.literal('SCORE'),
  value: z.number(),
});

export const ruleEffectSchema = z.discriminatedUnion('type', [
  setEffectSchema,
  addEffectSchema,
  subtractEffectSchema,
  scoreEffectSchema,
]);

export type SetEffect = z.infer<typeof setEffectSchema>;
export type AddEffect = z.infer<typeof addEffectSchema>;
export type SubtractEffect = z.infer<typeof subtractEffectSchema>;
export type ScoreEffect = z.infer<typeof scoreEffectSchema>;
export type RuleEffect = z.infer<typeof ruleEffectSchema>;
