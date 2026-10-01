import { experimentDefinitionSchema } from '@virtual-biology-lab/experiment-schema';
import type { z } from 'zod';
import { ValidationCodes, type ValidationIssue, error } from './errors.js';

function formatPath(path: PropertyKey[]): string {
  if (path.length === 0) return '(root)';
  return path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : String(segment)))
    .join('.')
    .replace(/\.\[/g, '[');
}

export interface StructuralResult {
  issues: ValidationIssue[];
  definition?: z.infer<typeof experimentDefinitionSchema>;
}

/** Structural Validator：Zod parse，失败即短路，不进入语义/能力校验。 */
export function validateStructural(input: unknown): StructuralResult {
  const result = experimentDefinitionSchema.safeParse(input);
  if (result.success) {
    return { issues: [], definition: result.data };
  }
  const issues = result.error.issues.map((issue) =>
    error(ValidationCodes.SCHEMA_INVALID, formatPath(issue.path), issue.message),
  );
  return { issues };
}
