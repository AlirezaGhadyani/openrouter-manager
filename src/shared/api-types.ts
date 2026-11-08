import type { Percentile } from './types.ts';

/** Shapes returned by OpenRouter's public API. Prices are USD per token, as strings. */

export interface RawPricing {
  prompt?: string;
  completion?: string;
  input_cache_read?: string;
  input_cache_write?: string;
  image?: string;
  request?: string;
  discount?: number;
  overrides?: RawPriceOverride[];
}

export interface RawPriceOverride {
  utc_start?: number;
  utc_end?: number;
  prompt?: string;
  completion?: string;
  input_cache_read?: string;
  image?: string;
  request?: string;
}

export interface RawModel {
  id: string;
  canonical_slug?: string | null;
  name?: string;
  created?: number;
  description?: string;
  context_length?: number | null;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string | null;
  };
  pricing?: RawPricing;
  top_provider?: {
    context_length?: number | null;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
  per_request_limits?: unknown;
  links?: { details?: string };
}

export interface RawPercentileStats {
  p50?: number | null;
  p75?: number | null;
  p90?: number | null;
  p99?: number | null;
}

export interface RawEndpoint {
  name?: string;
  model_id?: string;
  model_name?: string;
  context_length?: number | null;
  pricing?: RawPricing;
  provider_name?: string;
  tag?: string;
  service_tier?: string | null;
  quantization?: string | null;
  max_completion_tokens?: number | null;
  max_prompt_tokens?: number | null;
  supported_parameters?: string[];
  supports_tool_choice?: Record<string, boolean>;
  status?: number | null;
  uptime_last_30m?: number | null;
  uptime_last_5m?: number | null;
  uptime_last_1d?: number | null;
  supports_implicit_caching?: boolean;
  latency_last_30m?: RawPercentileStats | null;
  throughput_last_30m?: RawPercentileStats | null;
}

export interface RawEndpointsResponse {
  data?: {
    id?: string;
    name?: string;
    created?: number;
    description?: string;
    architecture?: RawModel['architecture'];
    endpoints?: RawEndpoint[];
  };
}

export interface RawModelsResponse {
  data?: RawModel[];
  total_count?: number;
  links?: unknown;
}

/** A compact catalog row kept in the panel's cache. */
export interface ModelSummary {
  id: string;
  canonicalSlug: string;
  name: string;
  author: string;
  created: number | null;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  inputModalities: string[];
  outputModalities: string[];
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  cacheReadPerMillion: number | null;
  cacheWritePerMillion: number | null;
  detailsPath: string | null;
}

export interface PriceOverride {
  utcStart: number;
  utcEnd: number;
  promptPerMillion: number | null;
  completionPerMillion: number | null;
  cacheReadPerMillion: number | null;
}

export type PercentileValues = Partial<Record<Percentile, number>>;

/** One provider endpoint, normalized for the comparison table. */
export interface EndpointInfo {
  tag: string;
  providerName: string;
  endpointName: string;
  modelId: string;
  inputPerMillion: number | null;
  outputPerMillion: number | null;
  cacheReadPerMillion: number | null;
  cacheWritePerMillion: number | null;
  imagePrice: number | null;
  requestPrice: number | null;
  latencyMs: PercentileValues | null;
  throughputTps: PercentileValues | null;
  contextLength: number | null;
  maxPromptTokens: number | null;
  maxCompletionTokens: number | null;
  quantization: string | null;
  serviceTier: string | null;
  status: number;
  available: boolean;
  uptime30m: number | null;
  uptime1d: number | null;
  supportsImplicitCaching: boolean;
  supportedParameters: string[];
  priceOverrides: PriceOverride[];
  lastUpdated: string;
}
