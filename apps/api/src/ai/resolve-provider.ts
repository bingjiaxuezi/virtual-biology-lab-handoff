import { InternalServerErrorException } from '@nestjs/common';
import { MockProvider } from './mock.provider.js';
import { OpenAICompatibleProvider } from './openai-compatible.provider.js';
import type { AIProvider } from './provider.js';

/** Provider 工厂：AI_PROVIDER=mock|openai-compatible，默认 mock（离线可用）。 */
export function resolveAIProvider(env: NodeJS.ProcessEnv = process.env): AIProvider {
  const kind = env.AI_PROVIDER ?? 'mock';
  if (kind === 'mock') return new MockProvider();

  if (kind === 'openai-compatible') {
    const baseUrl = env.AI_BASE_URL;
    const apiKey = env.AI_API_KEY;
    const model = env.AI_MODEL;
    if (!baseUrl || !apiKey || !model) {
      throw new InternalServerErrorException(
        'AI_PROVIDER=openai-compatible 需要 AI_BASE_URL / AI_API_KEY / AI_MODEL',
      );
    }
    return new OpenAICompatibleProvider(baseUrl, apiKey, model);
  }

  throw new InternalServerErrorException(`Unknown AI_PROVIDER "${kind}"`);
}
