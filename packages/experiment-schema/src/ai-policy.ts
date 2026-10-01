import { z } from 'zod';

export const hintLevelSchema = z.enum(['LIGHT', 'STANDARD', 'STRONG']);
export type HintLevel = z.infer<typeof hintLevelSchema>;

/**
 * AI Policy：Student AI 对 Runtime 只读，revealAnswer 在 v0.1 固定为 false。
 */
export const aiPolicySchema = z.object({
  briefing: z.object({
    enabled: z.boolean(),
  }),
  tutor: z.object({
    enabled: z.boolean(),
    hintLevel: hintLevelSchema,
    allowExplainTheory: z.boolean(),
    allowPointOutWrongDirection: z.boolean(),
    revealAnswer: z.literal(false),
  }),
  observationAssist: z.object({
    enabled: z.boolean(),
  }),
  review: z.object({
    enabled: z.boolean(),
  }),
});
export type AIPolicy = z.infer<typeof aiPolicySchema>;
