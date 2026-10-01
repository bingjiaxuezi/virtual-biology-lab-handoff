import { z } from 'zod';
import { conditionSchema } from './conditions.js';
import { ruleEffectSchema } from './effects.js';

export const transitionSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  condition: conditionSchema.optional(),
  priority: z.number().int().optional(),
});
export type Transition = z.infer<typeof transitionSchema>;

/** Rule 只描述世界状态变化，不提供 GOTO 类流程效果。 */
export const ruleSchema = z.object({
  id: z.string().min(1),
  when: conditionSchema,
  effects: z.array(ruleEffectSchema).min(1),
});
export type Rule = z.infer<typeof ruleSchema>;
