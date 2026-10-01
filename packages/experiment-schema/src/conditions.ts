import { z } from 'zod';

export const conditionOperatorSchema = z.enum(['EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE']);
export type ConditionOperator = z.infer<typeof conditionOperatorSchema>;

export const conditionValueSchema = z.union([z.number(), z.string(), z.boolean()]);
export type ConditionValue = z.infer<typeof conditionValueSchema>;

export const conditionSchema = z.object({
  variableId: z.string().min(1),
  operator: conditionOperatorSchema,
  value: conditionValueSchema,
});
export type Condition = z.infer<typeof conditionSchema>;
