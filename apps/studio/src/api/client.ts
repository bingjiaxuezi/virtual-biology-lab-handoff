import type {
  DraftSaveResult,
  ExperimentRecord,
  PublishResult,
  RunSummary,
  TrailEvent,
} from './types';

const BASE = '/api';
const TOKEN_KEY = 'vlab_studio_token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** 401 时通知应用层（AuthProvider 注册），统一跳回登录页。 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    if (response.status === 401) {
      setToken(null);
      onUnauthorized?.();
    }
    let message = `请求失败（${response.status}）`;
    let body: unknown;
    try {
      body = await response.json();
      const text = (body as { message?: string | string[] }).message;
      if (typeof text === 'string') message = text;
      else if (Array.isArray(text)) message = text.join('；');
    } catch {
      // 保留默认错误信息
    }
    throw new ApiError(response.status, message, body);
  }
  return (await response.json()) as T;
}

export const api = {
  register: (username: string, password: string) =>
    request<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  listExperiments: () => request<ExperimentRecord[]>('/experiments'),
  getExperiment: (id: string) => request<ExperimentRecord>(`/experiments/${id}`),
  createExperiment: (title: string, draft: unknown) =>
    request<DraftSaveResult>('/experiments', {
      method: 'POST',
      body: JSON.stringify({ title, draft }),
    }),
  updateExperiment: (id: string, input: { title?: string; draft?: unknown }) =>
    request<DraftSaveResult>(`/experiments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteExperiment: (id: string) =>
    request<{ deleted: boolean }>(`/experiments/${id}`, { method: 'DELETE' }),
  publishExperiment: (id: string) =>
    request<PublishResult>(`/experiments/${id}/publish`, { method: 'POST' }),
  listRuns: (id: string) => request<RunSummary[]>(`/experiments/${id}/runs`),
  getRunEvents: (runId: string) => request<TrailEvent[]>(`/runs/${runId}/events`),
};
