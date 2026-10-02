/** AIProvider 接口：隔离具体供应商（docs/architecture/ai-provider.md 的最小化落地）。 */

export interface StructuredGenerationRequest {
  systemPrompt: string;
  userPrompt: string;
  /** 期望输出的 JSON 结构说明（随 prompt 一同下发，供模型对齐字段）。 */
  jsonSchemaHint?: string;
  /** 结构化上下文（如 change 场景的当前草稿），Mock 等本地 Provider 直接消费。 */
  context?: { currentDefinition?: unknown; instruction?: string } | undefined;
}

export interface AIProvider {
  readonly id: string;
  /** 结构化生成：返回解析后的 JSON 对象（未校验，校验由调用方的三层 Validator 负责）。 */
  generateStructured(request: StructuredGenerationRequest): Promise<unknown>;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');
