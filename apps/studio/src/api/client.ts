import type {
  AiProposal,
  AssetRecord,
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

/** multipart 上传：不能用 request() 的 JSON Content-Type。 */
async function upload<T>(path: string, form: FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: form });
  if (!response.ok) {
    if (response.status === 401) {
      setToken(null);
      onUnauthorized?.();
    }
    let message = `上传失败（${response.status}）`;
    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === 'string') message = body.message;
    } catch {
      // 保留默认错误信息
    }
    throw new ApiError(response.status, message);
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
  aiGenerate: (id: string, intent: string) =>
    request<AiProposal>(`/experiments/${id}/ai/generate`, {
      method: 'POST',
      body: JSON.stringify({ intent }),
    }),
  aiChange: (id: string, instruction: string) =>
    request<AiProposal>(`/experiments/${id}/ai/change`, {
      method: 'POST',
      body: JSON.stringify({ instruction }),
    }),
  getRunEvents: (runId: string) => request<TrailEvent[]>(`/runs/${runId}/events`),

  /** 资源库：服务端登记的素材（含是否已有实体文件）。 */
  listAssets: () => request<AssetRecord[]>('/assets'),
  uploadAsset: (file: File, type: 'IMAGE' | 'VIDEO' | 'TEXT', name?: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    if (name) form.append('name', name);
    return upload<AssetRecord>('/assets/upload', form);
  },
};
