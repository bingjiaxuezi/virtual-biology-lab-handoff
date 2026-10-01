/** 稳定的校验错误码，供 AI Repair 与编辑器消费。 */
export const ValidationCodes = {
  SCHEMA_INVALID: 'SCHEMA_INVALID',
  START_MISSING: 'START_MISSING',
  START_DUPLICATE: 'START_DUPLICATE',
  END_MISSING: 'END_MISSING',
  END_UNREACHABLE: 'END_UNREACHABLE',
  NODE_UNREACHABLE: 'NODE_UNREACHABLE',
  NODE_ID_DUPLICATE: 'NODE_ID_DUPLICATE',
  TRANSITION_ID_DUPLICATE: 'TRANSITION_ID_DUPLICATE',
  TRANSITION_SOURCE_MISSING: 'TRANSITION_SOURCE_MISSING',
  TRANSITION_TARGET_MISSING: 'TRANSITION_TARGET_MISSING',
  VARIABLE_ID_DUPLICATE: 'VARIABLE_ID_DUPLICATE',
  VARIABLE_REF_UNDEFINED: 'VARIABLE_REF_UNDEFINED',
  ASSET_REF_UNDEFINED: 'ASSET_REF_UNDEFINED',
  CONDITION_TYPE_INCOMPATIBLE: 'CONDITION_TYPE_INCOMPATIBLE',
  CONDITION_VALUE_MISMATCH: 'CONDITION_VALUE_MISMATCH',
  EFFECT_TYPE_INCOMPATIBLE: 'EFFECT_TYPE_INCOMPATIBLE',
  CAPABILITY_UNSUPPORTED: 'CAPABILITY_UNSUPPORTED',
} as const;

export type ValidationCode = (typeof ValidationCodes)[keyof typeof ValidationCodes];

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  code: ValidationCode;
  path: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function error(code: ValidationCode, path: string, message: string): ValidationIssue {
  return { code, path, message, severity: 'error' };
}

export function warning(code: ValidationCode, path: string, message: string): ValidationIssue {
  return { code, path, message, severity: 'warning' };
}
