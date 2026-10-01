import { z } from 'zod';

export const variableTypeSchema = z.enum(['NUMBER', 'ENUM', 'BOOLEAN']);
export type VariableType = z.infer<typeof variableTypeSchema>;

const variableBase = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const numberVariableSchema = variableBase.extend({
  type: z.literal('NUMBER'),
  defaultValue: z.number(),
  min: z.number(),
  max: z.number(),
  unit: z.string().optional(),
});

export const enumVariableSchema = variableBase.extend({
  type: z.literal('ENUM'),
  options: z.array(z.string().min(1)).min(1),
  defaultValue: z.string().min(1),
});

export const booleanVariableSchema = variableBase.extend({
  type: z.literal('BOOLEAN'),
  defaultValue: z.boolean(),
});

export const experimentVariableSchema = z.discriminatedUnion('type', [
  numberVariableSchema,
  enumVariableSchema,
  booleanVariableSchema,
]);

export type NumberVariable = z.infer<typeof numberVariableSchema>;
export type EnumVariable = z.infer<typeof enumVariableSchema>;
export type BooleanVariable = z.infer<typeof booleanVariableSchema>;
export type ExperimentVariable = z.infer<typeof experimentVariableSchema>;
