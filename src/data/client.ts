import type { EndpointInfo, ModelSummary } from '../shared/api-types.ts';
import { endpointsPath, normalizeEndpoints, normalizeModels } from '../shared/normalize.ts';
import { errorMessage, hostErrorCode, type PanelHost } from './host.ts';

export type ApiFailureKind = 'disconnected' | 'auth' | 'rate-limit' | 'http' | 'invalid' | 'host';

export class OpenRouterError extends Error {
  readonly kind: ApiFailureKind;
  readonly status?: number;

  constructor(kind: ApiFailureKind, message: string, status?: number) {
    super(message);
    this.name = 'OpenRouterError';
    this.kind = kind;
    if (status !== undefined) this.status = status;
  }
}

export interface KeyInfo {
  label: string | null;
  usage: number | null;
  limit: number | null;
  isFreeTier: boolean | null;
  rateLimit: unknown;
}

function apiMessage(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown }; message?: unknown };
    if (parsed && typeof parsed.error?.message === 'string') return parsed.error.message;
    if (parsed && typeof parsed.message === 'string') return parsed.message;
  } catch {
    // Not JSON.
  }
  return null;
}

/**
 * A thin client over OpenChamber's integration proxy. The API key never enters
 * this code: the host attaches it to every call.
 */
export class OpenRouterClient {
  constructor(private readonly host: PanelHost) {}

  private async get(path: string, query?: Record<string, string>): Promise<{ status: number; body: string }> {
    try {
      return await this.host.request({ method: 'GET', path, ...(query ? { query } : {}) });
    } catch (error) {
      const code = hostErrorCode(error);
      if (code === 'DISCONNECTED') {
        throw new OpenRouterError(
          'disconnected',
          'OpenRouter is not connected. Add an API key in Settings → Integrations → OpenRouter.',
        );
      }
      throw new OpenRouterError('host', `OpenChamber could not make the request (${code ?? errorMessage(error)}).`);
    }
  }

  private async getJson<T>(path: string, query?: Record<string, string>): Promise<T> {
    const result = await this.get(path, query);
    if (result.status === 401 || result.status === 403) {
      throw new OpenRouterError(
        'auth',
        'OpenRouter rejected the API key. Reconnect it in Settings → Integrations → OpenRouter.',
        result.status,
      );
    }
    if (result.status === 429) {
      throw new OpenRouterError(
        'rate-limit',
        'OpenRouter rate-limited this request. Wait a moment, then refresh again.',
        429,
      );
    }
    if (result.status < 200 || result.status >= 300) {
      const detail = apiMessage(result.body);
      throw new OpenRouterError(
        'http',
        `OpenRouter returned ${result.status}${detail ? `: ${detail}` : '.'}`,
        result.status,
      );
    }
    try {
      return JSON.parse(result.body) as T;
    } catch {
      throw new OpenRouterError('invalid', 'OpenRouter returned a response this extension could not read.');
    }
  }

  async listModels(): Promise<ModelSummary[]> {
    const payload = await this.getJson<unknown>('/api/v1/models');
    const models = normalizeModels(payload);
    if (models.length === 0) {
      throw new OpenRouterError('invalid', 'OpenRouter returned an empty model catalog.');
    }
    return models;
  }

  async listEndpoints(model: Pick<ModelSummary, 'id' | 'canonicalSlug' | 'detailsPath'>): Promise<{
    modelId: string | null;
    endpoints: EndpointInfo[];
  }> {
    const payload = await this.getJson<unknown>(endpointsPath(model));
    const updatedAt = new Date().toISOString();
    return normalizeEndpoints(payload, updatedAt);
  }

  async keyInfo(): Promise<KeyInfo> {
    const payload = await this.getJson<{
      data?: {
        label?: unknown;
        usage?: unknown;
        limit?: unknown;
        is_free_tier?: unknown;
        rate_limit?: unknown;
      };
    }>('/api/v1/key');
    const data = payload.data ?? {};
    return {
      label: typeof data.label === 'string' ? data.label : null,
      usage: typeof data.usage === 'number' ? data.usage : null,
      limit: typeof data.limit === 'number' ? data.limit : null,
      isFreeTier: typeof data.is_free_tier === 'boolean' ? data.is_free_tier : null,
      rateLimit: data.rate_limit ?? null,
    };
  }
}
