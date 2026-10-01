import { z } from 'zod';
import { experimentDefinitionSchema } from './definition.js';

/**
 * 将 Experiment Definition v0.1 的 Zod Schema 转换为 JSON Schema，
 * 供 AI 输出约束与外部工具使用。
 */
export function experimentDefinitionJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(experimentDefinitionSchema) as Record<string, unknown>;
}
