import {
  type AIProvider,
  AiOutputParseError,
  type StructuredGenerationRequest,
  type TextGenerationRequest,
} from './provider.js';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  error?: { message?: string };
}

/** 单次 AI 请求的超时上限：防止 Provider 挂起导致 HTTP 请求一直悬挂。 */
const REQUEST_TIMEOUT_MS = 120_000;

/** OpenAI 兼容 Provider：同一协议覆盖 OpenAI / DeepSeek / 通义等，配置全走环境变量。 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly id = 'openai-compatible';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
    /** 输出上限：完整 Experiment Definition 较大，DeepSeek 默认 4096 会截断，故默认 8192。 */
    private readonly maxTokens = 8192,
  ) {}

  async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    const body = await this.postChat({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: request.systemPrompt },
        {
          role: 'user',
          content: request.jsonSchemaHint
            ? `${request.userPrompt}\n\n输出 JSON 结构要求：\n${request.jsonSchemaHint}`
            : request.userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const choice = body.choices?.[0];
    const content = choice?.message?.content;
    if (!content) {
      throw new Error(`AI provider returned no content: ${body.error?.message ?? 'unknown'}`);
    }
    if (choice?.finish_reason === 'length') {
      throw new AiOutputParseError(
        `AI 输出被截断（达到 max_tokens=${this.maxTokens} 上限，已输出 ${content.length} 字符）`,
      );
    }
    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new AiOutputParseError(`AI 输出不是合法 JSON（长度 ${content.length} 字符）`);
    }
  }

  async generateText(request: TextGenerationRequest): Promise<string> {
    const body = await this.postChat({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.userPrompt },
      ],
    });

    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`AI provider returned no content: ${body.error?.message ?? 'unknown'}`);
    }
    return content;
  }

  private async postChat(payload: Record<string, unknown>): Promise<ChatCompletionResponse> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'TimeoutError') {
        throw new Error(`AI 服务响应超时（>${REQUEST_TIMEOUT_MS / 1000}s），请重试`);
      }
      throw cause;
    }
    if (!response.ok) {
      throw new Error(`AI provider request failed: ${response.status}`);
    }
    return (await response.json()) as ChatCompletionResponse;
  }
}
