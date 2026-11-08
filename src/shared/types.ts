/** Types shared by the panel, the OpenCode plugin, and the tests. */

export type ProviderMode = 'all' | 'only' | 'exclude';
export type SortBy = 'price' | 'latency' | 'throughput';
export type Percentile = 'p50' | 'p75' | 'p90' | 'p99';
export type Partition = 'model' | 'none';
export type DataCollection = 'allow' | 'deny';

/**
 * A routing policy as the user edits it. Optional fields are "not set", which
 * means the request keeps OpenRouter's default for that knob.
 *
 * `localMaxCacheReadPerMillion` is deliberately local: OpenRouter has no
 * cache-read price ceiling in the `provider` object, so it is never sent.
 */
export interface RoutingPolicy {
  mode: ProviderMode;
  providers: string[];
  order: string[];
  allowFallbacks: boolean;

  maxPromptPerMillion?: number;
  maxCompletionPerMillion?: number;
  maxImagePrice?: number;
  maxRequestPrice?: number;

  sort?: SortBy;
  partition?: Partition;
  maxLatencySeconds?: number;
  maxLatencyPercentile?: Percentile;
  minThroughputTps?: number;
  minThroughputPercentile?: Percentile;

  quantizations?: string[];
  dataCollection?: DataCollection;
  zdr?: boolean;
  requireParameters?: boolean;
  enforceDistillableText?: boolean;

  localMaxCacheReadPerMillion?: number;
}

/**
 * A partial policy used by model overrides. Arrays replace, not append.
 * `null` removes a value inherited from the profile.
 */
export type PolicyOverride = {
  [K in keyof RoutingPolicy]?: RoutingPolicy[K] | null;
};

export interface RoutingProfile {
  id: string;
  name: string;
  description: string;
  builtin: boolean;
  policy: RoutingPolicy;
  createdAt: string;
  updatedAt: string;
}

export interface ModelRouting {
  /** `null` means the model has its own overrides but no profile. */
  profileId: string | null;
  overrides: PolicyOverride;
  customized: boolean;
  updatedAt: string;
}

export interface ManagerSettings {
  /** Master switch read by the plugin. Turning it off restores OpenRouter defaults. */
  enabled: boolean;
  defaultProfileId: string | null;
  /** OpenCode provider ids the plugin may touch. Default: ["openrouter"]. */
  providerIds: string[];
}

export const CONFIG_SCHEMA_VERSION = 1;

export interface ManagerConfig {
  schemaVersion: typeof CONFIG_SCHEMA_VERSION;
  revision: number;
  updatedAt: string;
  settings: ManagerSettings;
  profiles: RoutingProfile[];
  models: Record<string, ModelRouting>;
  /** canonical_slug -> canonical model id, learned from the catalog. */
  aliases: Record<string, string>;
}

/** The subset of OpenRouter's `provider` object this extension can produce. */
export interface OpenRouterProviderPreferences {
  order?: string[];
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  data_collection?: DataCollection;
  zdr?: boolean;
  enforce_distillable_text?: boolean;
  only?: string[];
  ignore?: string[];
  quantizations?: string[];
  sort?: SortBy | { by: SortBy; partition: Partition };
  preferred_min_throughput?: Partial<Record<Percentile, number>>;
  preferred_max_latency?: Partial<Record<Percentile, number>>;
  max_price?: {
    prompt?: number;
    completion?: number;
    image?: number;
    request?: number;
  };
}

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ResolvedModelPolicy {
  routingKey: string;
  profileId: string | null;
  policy: RoutingPolicy;
  provider: OpenRouterProviderPreferences | null;
}

export type AsyncStatus = 'idle' | 'loading' | 'ready' | 'error';
