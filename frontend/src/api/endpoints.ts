import api from './client';
import {
  AuthResponse, LoginRequest, RegisterRequest, Provider, CreateProviderRequest, UpdateProviderRequest,
  AIModel, CreateModelRequest, ApiKey, ApiKeyFull, CreateApiKeyRequest, BulkPricingRequest,
  UsageSummary, UsageChart, UsageRecord, PromptTemplate, CreatePromptTemplateRequest,
  Invoice, Plan, BillingSummary, CheckoutRequest, CheckoutResult, CancelResult,
  AnalyticsOverview, AdminUser, Setting, AuditLog, ChatRequest,
  UpdateModelRequest, ChatMessage, TestResult, ProviderType, CreateProviderTypeRequest,
  StreamEvent, ChatToolCall, BulkModelTestItem, ProviderApiKey,
} from '../types';

const parseStreamChunk = (json: string): StreamEvent => {
  const parsed = JSON.parse(json);
  const delta = parsed.choices?.[0]?.delta ?? parsed.delta ?? {};
  const ev: StreamEvent = {};
  const content = parsed.content ?? delta.content ?? '';
  if (content) ev.content = content;
  const reasoning = delta.reasoning_content ?? delta.reasoning ?? delta.thinking ?? delta.thinking_content ?? '';
  if (reasoning) ev.reasoning = reasoning;
  const rawTools = delta.tool_calls ?? parsed.tool_calls;
  if (Array.isArray(rawTools) && rawTools.length > 0) {
    ev.toolCalls = rawTools.map((t: any) => ({
      id: t.id,
      name: t.function?.name ?? t.name,
      arguments: t.function?.arguments ?? t.arguments,
    })) as ChatToolCall[];
  }
  return ev;
};

export interface CustomChatConfig {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export const auth = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<AuthResponse>('/auth/register', data),
  refresh: (refreshToken: string) => api.post<AuthResponse>('/auth/refresh', { refreshToken }),
  profile: () => api.get('/auth/profile'),
};

export const providers = {
  getAll: () => api.get<Provider[]>('/providers'),
  create: (data: CreateProviderRequest) => api.post<Provider>('/providers', data),
  update: (id: string, data: UpdateProviderRequest) => api.put<Provider>(`/providers/${id}`, data),
  delete: (id: string) => api.delete(`/providers/${id}`),
};

export const providerKeys = {
  list: (providerId: string) => api.get<ProviderApiKey[]>(`/providers/${providerId}/keys`),
  add: (providerId: string, data: { keyValue: string; name?: string; expiresAt?: string | null; isActive?: boolean }) => api.post<ProviderApiKey>(`/providers/${providerId}/keys`, data),
  setDefault: (providerId: string, keyId: string) => api.put<ProviderApiKey>(`/providers/${providerId}/keys/${keyId}/default`),
  setActive: (providerId: string, keyId: string, isActive: boolean) => api.put<ProviderApiKey>(`/providers/${providerId}/keys/${keyId}/active`, { isActive }),
  remove: (providerId: string, keyId: string) => api.delete(`/providers/${providerId}/keys/${keyId}`),
};

export const providerTypes = {
  getAll: () => api.get<ProviderType[]>('/providertypes'),
  create: (data: CreateProviderTypeRequest) => api.post<ProviderType>('/providertypes', data),
  delete: (id: string) => api.delete(`/providertypes/${id}`),
};

export const models = {
  getAll: (providerId?: string) => api.get<AIModel[]>('/models', { params: { providerId } }),
  create: (data: CreateModelRequest) => api.post<AIModel>('/models', data),
  update: (id: string, data: UpdateModelRequest) => api.put<AIModel>(`/models/${id}`, data),
  delete: (id: string) => api.delete(`/models/${id}`),
  test: (id: string) => api.post<TestResult>(`/models/${id}/test`),
  testBulk: (modelIds?: string[]) => api.post<BulkModelTestItem[]>('/models/test-bulk', { modelIds }),
  bulkPricing: (data: BulkPricingRequest) => api.put<number>('/models/pricing/bulk', data),
  import: (providerId: string, models: CreateModelRequest[]) => api.post<{ added: number; skipped: number; failed: string[] }>('/models/import', { providerId, models }),
};

export const apiKeys = {
  getAll: () => api.get<ApiKey[]>('/apikeys'),
  get: (id: string) => api.get<ApiKeyFull>(`/apikeys/${id}`),
  create: (data: CreateApiKeyRequest) => api.post<ApiKeyFull>('/apikeys', data),
  delete: (id: string) => api.delete(`/apikeys/${id}`),
  setAllowedModels: (id: string, modelIds: string[]) => api.put(`/apikeys/${id}/models`, { ModelIds: modelIds }),
};

export const usage = {
  summary: () => api.get<UsageSummary>('/usage/summary'),
  charts: (days = 30, providerName?: string, modelName?: string, from?: Date, to?: Date) => api.get<UsageChart[]>('/usage/charts', { params: { days, ...(providerName ? { providerName } : {}), ...(modelName ? { modelName } : {}), ...(from ? { from: from.toISOString() } : {}), ...(to ? { to: to.toISOString() } : {}) } }),
  records: (page = 1, pageSize = 50, days?: number, includeContent = false, apiKeyId?: string) => api.get<UsageRecord[]>('/usage/records', { params: { page, pageSize, ...(days ? { days } : {}), includeContent, ...(apiKeyId ? { apiKeyId } : {}) } }),
};

export const analytics = {
  overview: () => api.get<AnalyticsOverview>('/analytics/overview'),
};

export const billing = {
  plans: () => api.get<Plan[]>('/billing/plans'),
  summary: () => api.get<BillingSummary>('/billing/summary'),
  invoices: () => api.get<Invoice[]>('/billing/invoices'),
  checkout: (data: CheckoutRequest) => api.post<CheckoutResult>('/billing/checkout', data),
  cancel: () => api.post<CancelResult>('/billing/cancel'),
};

export const promptTemplates = {
  getAll: () => api.get<PromptTemplate[]>('/prompttemplates'),
  create: (data: CreatePromptTemplateRequest) => api.post<PromptTemplate>('/prompttemplates', data),
};

export const admin = {
  users: () => api.get<AdminUser[]>('/admin/users'),
  updateRole: (userId: string, role: string) => api.put(`/admin/users/${userId}/role`, { userId, role }),
};

export const settings = {
  getAll: () => api.get<Setting[]>('/settings'),
  update: (key: string, value: string) => api.put(`/settings/${key}`, { value }),
};

export const logs = {
  getAll: (page = 1, pageSize = 50) => api.get<AuditLog[]>('/logs', { params: { page, pageSize } }),
};

export const chat = {
  send: async (data: ChatRequest) => {
    const { data: result } = await api.post('/chat', data);
    return result;
  },
  sendStream: async (data: ChatRequest, onEvent: (ev: StreamEvent) => void, signal?: AbortSignal) => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...data, stream: true }),
      signal,
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            onEvent(parseStreamChunk(line.slice(6)));
          } catch { /* skip malformed chunk */ }
        }
      }
    }
  },
  sendCustom: async (config: CustomChatConfig, messages: ChatMessage[], settings?: ChatRequest['settings']) => {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages,
        temperature: settings?.temperature,
        top_p: settings?.topP,
        max_tokens: settings?.maxTokens,
        frequency_penalty: settings?.frequencyPenalty,
        presence_penalty: settings?.presencePenalty,
        stop: settings?.stopSequence || undefined,
      }),
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? data.content ?? '';
  },
  sendCustomStream: async (
    config: CustomChatConfig, messages: ChatMessage[], onEvent: (ev: StreamEvent) => void,
    settings?: ChatRequest['settings'], signal?: AbortSignal,
  ) => {
    const baseUrl = config.baseUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages,
        stream: true,
        temperature: settings?.temperature,
        top_p: settings?.topP,
        max_tokens: settings?.maxTokens,
        frequency_penalty: settings?.frequencyPenalty,
        presence_penalty: settings?.presencePenalty,
        stop: settings?.stopSequence || undefined,
      }),
      signal,
    });
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            onEvent(parseStreamChunk(line.slice(6)));
          } catch { /* skip */ }
        }
      }
    }
  },
};
