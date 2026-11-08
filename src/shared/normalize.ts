import type {
  EndpointInfo,
  ModelSummary,
  PercentileValues,
  PriceOverride,
  RawEndpoint,
  RawEndpointsResponse,
  RawModel,
  RawModelsResponse,
  RawPercentileStats,
  RawPricing,
} from './api-types.ts';
import { modelAuthor } from './model-id.ts';
import type { Percentile } from './types.ts';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** OpenRouter quotes USD per token; the UI speaks USD per million tokens. */
export function perMillion(value: unknown): number | null {
  const raw = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(raw) || raw < 0) return null;
  return Math.round(raw * 1_000_000 * 1e6) / 1e6;
}

/** Image and per-request prices are already USD per unit, not per token. */
export function usd(value: unknown): number | null {
  const raw = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(raw) || raw < 0) return null;
  return Math.round(raw * 1e6) / 1e6;
}

function count(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

function percent(value: unknown): number | null {
  const n = typeof value === 'number' ? value : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

const PERCENTILE_KEYS: readonly Percentile[] = ['p50', 'p75', 'p90', 'p99'];

function percentiles(raw: RawPercentileStats | null | undefined): PercentileValues | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: PercentileValues = {};
  for (const key of PERCENTILE_KEYS) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

function priceOverrides(pricing: RawPricing | undefined): PriceOverride[] {
  if (!pricing || !Array.isArray(pricing.overrides)) return [];
  const result: PriceOverride[] = [];
  for (const entry of pricing.overrides) {
    if (!entry || typeof entry !== 'object') continue;
    result.push({
      utcStart: count(entry.utc_start) ?? 0,
      utcEnd: count(entry.utc_end) ?? 0,
      promptPerMillion: perMillion(entry.prompt),
      completionPerMillion: perMillion(entry.completion),
      cacheReadPerMillion: perMillion(entry.input_cache_read),
    });
  }
  return result;
}

function modalities(raw: RawModel['architecture']): { input: string[]; output: string[] } {
  const input = Array.isArray(raw?.input_modalities) ? raw.input_modalities.filter((x) => typeof x === 'string') : [];
  const output = Array.isArray(raw?.output_modalities) ? raw.output_modalities.filter((x) => typeof x === 'string') : [];
  if ((input.length === 0 || output.length === 0) && typeof raw?.modality === 'string') {
    const [left, right] = raw.modality.split('->');
    return {
      input: input.length > 0 ? input : (left?.split('+').filter(Boolean) ?? []),
      output: output.length > 0 ? output : (right?.split('+').filter(Boolean) ?? []),
    };
  }
  return { input, output };
}

export function normalizeModel(value: unknown): ModelSummary | null {
  const raw = record(value) as RawModel | null;
  if (!raw || typeof raw.id !== 'string' || !raw.id.trim()) return null;
  const id = raw.id.trim();
  const architecture = raw.architecture;
  const { input, output } = modalities(architecture);
  const pricing = raw.pricing;
  return {
    id,
    canonicalSlug:
      typeof raw.canonical_slug === 'string' && raw.canonical_slug.trim() ? raw.canonical_slug.trim() : id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : id,
    author: modelAuthor(id),
    created: count(raw.created),
    contextLength: count(raw.top_provider?.context_length) ?? count(raw.context_length),
    maxCompletionTokens: count(raw.top_provider?.max_completion_tokens),
    inputModalities: input,
    outputModalities: output,
    inputPerMillion: perMillion(pricing?.prompt),
    outputPerMillion: perMillion(pricing?.completion),
    cacheReadPerMillion: perMillion(pricing?.input_cache_read),
    cacheWritePerMillion: perMillion(pricing?.input_cache_write),
    detailsPath: typeof raw.links?.details === 'string' ? raw.links.details : null,
  };
}

export function normalizeModels(payload: unknown): ModelSummary[] {
  const raw = record(payload) as RawModelsResponse | null;
  if (!raw || !Array.isArray(raw.data)) return [];
  const seen = new Set<string>();
  const models: ModelSummary[] = [];
  for (const item of raw.data) {
    const model = normalizeModel(item);
    if (!model || seen.has(model.id)) continue;
    seen.add(model.id);
    models.push(model);
  }
  return models;
}

export function normalizeEndpoint(value: unknown, fallbackModelId: string, updatedAt: string): EndpointInfo | null {
  const raw = record(value) as RawEndpoint | null;
  if (!raw || typeof raw.tag !== 'string' || !raw.tag.trim()) return null;
  const tag = raw.tag.trim();
  const status = count(raw.status) ?? 0;
  const pricing = raw.pricing;
  return {
    tag,
    providerName:
      typeof raw.provider_name === 'string' && raw.provider_name.trim()
        ? raw.provider_name.trim()
        : (tag.split('/')[0] ?? tag),
    endpointName: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : tag,
    modelId: typeof raw.model_id === 'string' && raw.model_id.trim() ? raw.model_id.trim() : fallbackModelId,
    inputPerMillion: perMillion(pricing?.prompt),
    outputPerMillion: perMillion(pricing?.completion),
    cacheReadPerMillion: perMillion(pricing?.input_cache_read),
    cacheWritePerMillion: perMillion(pricing?.input_cache_write),
    imagePrice: usd(pricing?.image),
    requestPrice: usd(pricing?.request),
    latencyMs: percentiles(raw.latency_last_30m),
    throughputTps: percentiles(raw.throughput_last_30m),
    contextLength: count(raw.context_length),
    maxPromptTokens: count(raw.max_prompt_tokens),
    maxCompletionTokens: count(raw.max_completion_tokens),
    quantization: typeof raw.quantization === 'string' && raw.quantization ? raw.quantization : null,
    serviceTier: typeof raw.service_tier === 'string' && raw.service_tier ? raw.service_tier : null,
    status,
    available: status === 0,
    uptime30m: percent(raw.uptime_last_30m),
    uptime1d: percent(raw.uptime_last_1d),
    supportsImplicitCaching: raw.supports_implicit_caching === true,
    supportedParameters: Array.isArray(raw.supported_parameters)
      ? raw.supported_parameters.filter((x): x is string => typeof x === 'string')
      : [],
    priceOverrides: priceOverrides(pricing),
    lastUpdated: updatedAt,
  };
}

export function normalizeEndpoints(payload: unknown, updatedAt: string): { modelId: string | null; endpoints: EndpointInfo[] } {
  const raw = record(payload) as RawEndpointsResponse | null;
  const data = record(raw?.data);
  if (!data) return { modelId: null, endpoints: [] };
  const modelId = typeof data.id === 'string' ? data.id : null;
  const source = Array.isArray(data.endpoints) ? data.endpoints : [];
  const seen = new Set<string>();
  const endpoints: EndpointInfo[] = [];
  for (const item of source) {
    const endpoint = normalizeEndpoint(item, modelId ?? '', updatedAt);
    if (!endpoint || seen.has(endpoint.tag)) continue;
    seen.add(endpoint.tag);
    endpoints.push(endpoint);
  }
  return { modelId, endpoints };
}

const SAFE_ENDPOINT_PATH = /^\/api\/v1\/models\/[A-Za-z0-9._:/-]+\/endpoints$/;

function isSafeEndpointPath(path: string): boolean {
  return SAFE_ENDPOINT_PATH.test(path) && !path.includes('..');
}

/** The endpoints path for a model, preferring the API's own `links.details`. */
export function endpointsPath(model: Pick<ModelSummary, 'id' | 'canonicalSlug' | 'detailsPath'>): string {
  if (model.detailsPath && isSafeEndpointPath(model.detailsPath)) return model.detailsPath;
  const slug = (model.canonicalSlug || model.id)
    .split('/')
    .filter(Boolean)
    .map((segment) => (segment === '.' || segment === '..' ? '_' : encodeURIComponent(segment)))
    .join('/');
  return `/api/v1/models/${slug}/endpoints`;
}

export function bestPrice(endpoints: readonly EndpointInfo[], key: 'inputPerMillion' | 'outputPerMillion'): number | null {
  let best: number | null = null;
  for (const endpoint of endpoints) {
    const value = endpoint[key];
    if (value === null) continue;
    if (best === null || value < best) best = value;
  }
  return best;
}

export function bestPercentile(
  endpoints: readonly EndpointInfo[],
  metric: 'latencyMs' | 'throughputTps',
  percentile: Percentile,
): number | null {
  let best: number | null = null;
  for (const endpoint of endpoints) {
    const value = endpoint[metric]?.[percentile];
    if (value === undefined) continue;
    if (best === null) best = value;
    else if (metric === 'latencyMs' ? value < best : value > best) best = value;
  }
  return best;
}
