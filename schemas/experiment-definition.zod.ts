import { z } from 'zod';

export const NumberVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('NUMBER'),
  defaultValue: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().optional(),
});

export const EnumVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('ENUM'),
  defaultValue: z.string(),
  options: z.array(z.string()).min(1),
});

export const BooleanVariableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('BOOLEAN'),
  defaultValue: z.boolean(),
});

export const ExperimentVariableSchema = z.discriminatedUnion('type', [
  NumberVariableSchema,
  EnumVariableSchema,
  BooleanVariableSchema,
]);

export const ConditionSchema = z.object({
  variableId: z.string().min(1),
  operator: z.enum(['EQ', 'NEQ', 'GT', 'LT', 'GTE', 'LTE']),
  value: z.unknown(),
});

// NOTE: this file is a handoff skeleton, not the final implementation.
// Codex Phase 1 should complete Node, Transition, Rule, Assessment and AIPolicy schemas,
// then add semantic/capability validation in separate packages.
