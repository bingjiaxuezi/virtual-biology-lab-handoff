import type {
  CatalogItem,
  DispatchResult,
  PublishedVersion,
  RunEvent,
  RunView,
  RuntimeCommand,
} from './types';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      const text = Array.isArray(body.message) ? body.message.join('；') : body.message;
      if (text) message = text;
    } catch {
      // 保留默认错误信息
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export const api = {
  listCatalog: () => request<CatalogItem[]>('/catalog'),
  getVersion: (versionId: string) => request<PublishedVersion>(`/catalog/versions/${versionId}`),
  createRun: (experimentVersionId: string, studentId: string) =>
    request<RunView>('/runs', {
      method: 'POST',
      body: JSON.stringify({ experimentVersionId, studentId }),
    }),
  getRun: (runId: string) => request<RunView>(`/runs/${runId}`),
  startRun: (runId: string) => request<DispatchResult>(`/runs/${runId}/start`, { method: 'POST' }),
  dispatch: (runId: string, command: RuntimeCommand) =>
    request<DispatchResult>(`/runs/${runId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(command),
    }),
  getEvents: (runId: string) => request<RunEvent[]>(`/runs/${runId}/events`),
  aiBriefing: (runId: string) =>
    request<{ text: string }>(`/runs/${runId}/ai/briefing`, { method: 'POST' }),
  aiHint: (runId: string) =>
    request<{ text: string }>(`/runs/${runId}/ai/hint`, { method: 'POST' }),
  aiObservationAssist: (runId: string, draftText: string) =>
    request<{ suggestion: string }>(`/runs/${runId}/ai/observation-assist`, {
      method: 'POST',
      body: JSON.stringify({ draftText }),
    }),
  aiReview: (runId: string) =>
    request<{ text: string }>(`/runs/${runId}/ai/review`, { method: 'POST' }),
};
