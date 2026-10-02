import type { AIProvider, StructuredGenerationRequest, TextGenerationRequest } from './provider.js';

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

/** OpenAI 兼容 Provider：同一协议覆盖 OpenAI / DeepSeek / 通义等，配置全走环境变量。 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly id = 'openai-compatible';

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateStructured(request: StructuredGenerationRequest): Promise<unknown> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
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
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed: ${response.status}`);
    }
    const body = (await response.json()) as ChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`AI provider returned no content: ${body.error?.message ?? 'unknown'}`);
    }
    return JSON.parse(content) as unknown;
  }

  async generateText(request: TextGenerationRequest): Promise<string> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI provider request failed: ${response.status}`);
    }
    const body = (await response.json()) as ChatCompletionResponse;
    const content = body.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`AI provider returned no content: ${body.error?.message ?? 'unknown'}`);
    }
    return content;
  }
}
