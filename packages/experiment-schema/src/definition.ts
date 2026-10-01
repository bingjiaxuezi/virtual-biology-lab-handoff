import { z } from 'zod';
import { aiPolicySchema } from './ai-policy.js';
import { assetReferenceSchema } from './assets.js';
import { ruleSchema, transitionSchema } from './flow.js';
import { experimentNodeSchema } from './nodes.js';
import { experimentVariableSchema } from './variables.js';

export const experimentMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});
export type ExperimentMetadata = z.infer<typeof experimentMetadataSchema>;

export const teachingDesignSchema = z.object({
  objectives: z.array(z.string().min(1)).min(1),
  durationMinutes: z.number().int().positive().optional(),
  prerequisites: z.array(z.string().min(1)).optional(),
});
export type TeachingDesign = z.infer<typeof teachingDesignSchema>;

export const assessmentConfigSchema = z.object({
  initialScore: z.number(),
  completion: z.object({
    type: z.enum(['REACH_END', 'ALL_REQUIRED_NODES']),
  }),
  summary: z.object({
    showScore: z.boolean(),
    showKeyEvents: z.boolean(),
  }),
});
export type AssessmentConfig = z.infer<typeof assessmentConfigSchema>;

export const experimentDefinitionSchema = z.object({
  schemaVersion: z.literal('0.1'),
  id: z.string().min(1),
  version: z.number().int().positive(),
  metadata: experimentMetadataSchema,
  teaching: teachingDesignSchema,
  variables: z.array(experimentVariableSchema),
  assets: z.array(assetReferenceSchema),
  nodes: z.array(experimentNodeSchema).min(1),
  transitions: z.array(transitionSchema),
  rules: z.array(ruleSchema),
  assessment: assessmentConfigSchema,
  aiPolicy: aiPolicySchema,
});
export type ExperimentDefinition = z.infer<typeof experimentDefinitionSchema>;
