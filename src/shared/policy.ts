import type {
  OpenRouterProviderPreferences,
  Percentile,
  PolicyOverride,
  ProviderMode,
  RoutingPolicy,
  SortBy,
  ValidationIssue,
} from './types.ts';

export const PERCENTILES: readonly Percentile[] = ['p50', 'p75', 'p90', 'p99'];
export const SORT_BYS: readonly SortBy[] = ['price', 'latency', 'throughput'];
export const PROVIDER_MODES: readonly ProviderMode[] = ['all', 'only', 'exclude'];

const PROVIDER_SLUG = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;

export function emptyPolicy(): RoutingPolicy {
  return { mode: 'all', providers: [], order: [], allowFallbacks: true };
}

export function clonePolicy(policy: RoutingPolicy): RoutingPolicy {
  return {
    ...policy,
    providers: [...policy.providers],
    order: [...policy.order],
    ...(policy.quantizations ? { quantizations: [...policy.quantizations] } : {}),
  };
}

function cleanSlug(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const slug = value.trim().toLowerCase();
  return slug && PROVIDER_SLUG.test(slug) ? slug : null;
}

export function cleanProviders(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const slug = cleanSlug(item);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      result.push(slug);
    }
  }
  return result;
}

function positive(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function nonNegative(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/**
 * Coerce untrusted JSON (a file on disk, a stale config, a crafted value) into
 * a valid policy. Invalid numbers and enums become "not set" rather than
 * reaching a request.
 */
export function sanitizePolicy(input: unknown, fallback: RoutingPolicy = emptyPolicy()): RoutingPolicy {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return clonePolicy(fallback);
  const raw = input as Record<string, unknown>;
  const policy: RoutingPolicy = {
    mode: oneOf(raw.mode, PROVIDER_MODES) ?? fallback.mode,
    providers: raw.providers === undefined ? [...fallback.providers] : cleanProviders(raw.providers),
    order: raw.order === undefined ? [...fallback.order] : cleanProviders(raw.order),
    allowFallbacks:
      typeof raw.allowFallbacks === 'boolean' ? raw.allowFallbacks : fallback.allowFallbacks,
  };

  const maxPrompt = nonNegative(raw.maxPromptPerMillion);
  if (maxPrompt !== undefined) policy.maxPromptPerMillion = maxPrompt;
  const maxCompletion = nonNegative(raw.maxCompletionPerMillion);
  if (maxCompletion !== undefined) policy.maxCompletionPerMillion = maxCompletion;
  const maxImage = nonNegative(raw.maxImagePrice);
  if (maxImage !== undefined) policy.maxImagePrice = maxImage;
  const maxRequest = nonNegative(raw.maxRequestPrice);
  if (maxRequest !== undefined) policy.maxRequestPrice = maxRequest;

  const sort = oneOf(raw.sort, SORT_BYS);
  if (sort) policy.sort = sort;
  const partition = oneOf(raw.partition, ['model', 'none'] as const);
  if (partition && sort) policy.partition = partition;

  const latency = positive(raw.maxLatencySeconds);
  const latencyPercentile = oneOf(raw.maxLatencyPercentile, PERCENTILES);
  if (latency !== undefined) {
    policy.maxLatencySeconds = latency;
    policy.maxLatencyPercentile = latencyPercentile ?? 'p50';
  }
  const throughput = positive(raw.minThroughputTps);
  const throughputPercentile = oneOf(raw.minThroughputPercentile, PERCENTILES);
  if (throughput !== undefined) {
    policy.minThroughputTps = throughput;
    policy.minThroughputPercentile = throughputPercentile ?? 'p50';
  }

  const quantizations = cleanProviders(raw.quantizations);
  if (quantizations.length > 0) policy.quantizations = quantizations;
  const dataCollection = oneOf(raw.dataCollection, ['allow', 'deny'] as const);
  if (dataCollection) policy.dataCollection = dataCollection;
  if (raw.zdr === true) policy.zdr = true;
  if (raw.requireParameters === true) policy.requireParameters = true;
  if (raw.enforceDistillableText === true) policy.enforceDistillableText = true;

  const localCache = nonNegative(raw.localMaxCacheReadPerMillion);
  if (localCache !== undefined) policy.localMaxCacheReadPerMillion = localCache;

  return policy;
}

/** Optional keys a profile can provide and a model can override or remove. */
export const OPTIONAL_POLICY_KEYS = [
  'maxPromptPerMillion',
  'maxCompletionPerMillion',
  'maxImagePrice',
  'maxRequestPrice',
  'sort',
  'partition',
  'maxLatencySeconds',
  'maxLatencyPercentile',
  'minThroughputTps',
  'minThroughputPercentile',
  'quantizations',
  'dataCollection',
  'zdr',
  'requireParameters',
  'enforceDistillableText',
  'localMaxCacheReadPerMillion',
] as const;

function equal(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => value === b[index]);
  }
  return a === b;
}

/** Merge a partial override over a base policy. Arrays replace; `null` removes. */
export function mergePolicy(base: RoutingPolicy, override: PolicyOverride | undefined): RoutingPolicy {
  const merged = clonePolicy(base);
  if (!override) return merged;
  const record = override as Record<string, unknown>;

  if (override.mode !== undefined && override.mode !== null) merged.mode = override.mode;
  if (override.providers !== undefined && override.providers !== null) {
    merged.providers = cleanProviders(override.providers);
  }
  if (override.order !== undefined && override.order !== null) {
    merged.order = cleanProviders(override.order);
  }
  if (override.allowFallbacks !== undefined && override.allowFallbacks !== null) {
    merged.allowFallbacks = override.allowFallbacks;
  }

  for (const key of OPTIONAL_POLICY_KEYS) {
    if (record[key] === null) delete (merged as unknown as Record<string, unknown>)[key];
  }
  const candidate = { ...merged } as Record<string, unknown>;
  for (const key of OPTIONAL_POLICY_KEYS) {
    const value = record[key];
    if (value !== undefined && value !== null) candidate[key] = value;
  }
  return sanitizePolicy(candidate, merged);
}

/** The override that turns `base` into `edited`; `null` records a removal. */
export function diffPolicy(base: RoutingPolicy, edited: RoutingPolicy): PolicyOverride {
  const out: Record<string, unknown> = {};
  const baseRecord = base as unknown as Record<string, unknown>;
  const editedRecord = edited as unknown as Record<string, unknown>;
  for (const key of ['mode', 'providers', 'order', 'allowFallbacks', ...OPTIONAL_POLICY_KEYS] as const) {
    const before = baseRecord[key];
    const after = editedRecord[key];
    if (equal(before, after)) continue;
    out[key] = after === undefined ? null : after;
  }
  return out as PolicyOverride;
}

export function overrideCount(override: PolicyOverride | undefined): number {
  return override ? Object.keys(override).length : 0;
}

/** True when the policy carries no setting that changes a request. */
export function isPolicyEmpty(policy: RoutingPolicy): boolean {
  return policyToProvider(policy) === null;
}

/**
 * Build the OpenRouter `provider` object.
 *
 * Only documented fields are produced. `localMaxCacheReadPerMillion` is not
 * part of the object and is intentionally omitted: OpenRouter has no
 * cache-read ceiling in routing requests.
 */
export function policyToProvider(policy: RoutingPolicy): OpenRouterProviderPreferences | null {
  const out: OpenRouterProviderPreferences = {};

  const providers = cleanProviders(policy.providers);
  if (policy.mode === 'only' && providers.length > 0) out.only = providers;
  if (policy.mode === 'exclude' && providers.length > 0) out.ignore = providers;

  const order = cleanProviders(policy.order);
  if (order.length > 0) out.order = order;

  if (policy.allowFallbacks === false) out.allow_fallbacks = false;

  if (policy.sort && SORT_BYS.includes(policy.sort)) {
    if (policy.partition === 'model' || policy.partition === 'none') {
      out.sort = { by: policy.sort, partition: policy.partition };
    } else {
      out.sort = policy.sort;
    }
  }

  const maxPrice: NonNullable<OpenRouterProviderPreferences['max_price']> = {};
  if (policy.maxPromptPerMillion !== undefined) maxPrice.prompt = policy.maxPromptPerMillion;
  if (policy.maxCompletionPerMillion !== undefined) maxPrice.completion = policy.maxCompletionPerMillion;
  if (policy.maxImagePrice !== undefined) maxPrice.image = policy.maxImagePrice;
  if (policy.maxRequestPrice !== undefined) maxPrice.request = policy.maxRequestPrice;
  if (Object.keys(maxPrice).length > 0) out.max_price = maxPrice;

  if (policy.maxLatencySeconds !== undefined) {
    out.preferred_max_latency = {
      [policy.maxLatencyPercentile ?? 'p50']: policy.maxLatencySeconds,
    };
  }
  if (policy.minThroughputTps !== undefined) {
    out.preferred_min_throughput = {
      [policy.minThroughputPercentile ?? 'p50']: policy.minThroughputTps,
    };
  }

  const quantizations = cleanProviders(policy.quantizations);
  if (quantizations.length > 0) out.quantizations = quantizations;
  if (policy.dataCollection) out.data_collection = policy.dataCollection;
  if (policy.zdr === true) out.zdr = true;
  if (policy.requireParameters === true) out.require_parameters = true;
  if (policy.enforceDistillableText === true) out.enforce_distillable_text = true;

  return Object.keys(out).length === 0 ? null : out;
}

/** The provider object's top-level keys, for UI badges and status reports. */
export function providerKeys(provider: OpenRouterProviderPreferences | null): string[] {
  return provider ? Object.keys(provider) : [];
}

export function validatePolicy(policy: RoutingPolicy): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (policy.mode !== 'all' && policy.providers.length === 0) {
    issues.push({
      field: 'providers',
      severity: 'error',
      message:
        policy.mode === 'only'
          ? 'Choose at least one provider to allow, or switch to "All providers".'
          : 'Choose at least one provider to exclude, or switch to "All providers".',
    });
  }

  const bad = [...policy.providers, ...policy.order].filter((slug) => !PROVIDER_SLUG.test(slug));
  for (const slug of bad) {
    issues.push({ field: 'providers', severity: 'error', message: `"${slug}" is not a provider slug.` });
  }

  if (policy.mode === 'exclude' && policy.order.length > 0) {
    const overlap = policy.order.filter((slug) => policy.providers.includes(slug));
    if (overlap.length > 0) {
      issues.push({
        field: 'order',
        severity: 'warning',
        message: `Order lists excluded providers (${overlap.join(', ')}); they will not be tried.`,
      });
    }
  }
  if (policy.mode === 'only' && policy.order.length > 0) {
    const outside = policy.order.filter((slug) => !policy.providers.includes(slug));
    if (outside.length > 0) {
      issues.push({
        field: 'order',
        severity: 'warning',
        message: `Order names providers outside "Only" (${outside.join(', ')}); OpenRouter ignores them.`,
      });
    }
  }

  if (policy.maxPromptPerMillion !== undefined && policy.maxPromptPerMillion < 0) {
    issues.push({ field: 'maxPromptPerMillion', severity: 'error', message: 'Price cannot be negative.' });
  }
  if (policy.maxCompletionPerMillion !== undefined && policy.maxCompletionPerMillion < 0) {
    issues.push({ field: 'maxCompletionPerMillion', severity: 'error', message: 'Price cannot be negative.' });
  }
  if (policy.maxImagePrice !== undefined && policy.maxImagePrice < 0) {
    issues.push({ field: 'maxImagePrice', severity: 'error', message: 'Price cannot be negative.' });
  }
  if (policy.maxRequestPrice !== undefined && policy.maxRequestPrice < 0) {
    issues.push({ field: 'maxRequestPrice', severity: 'error', message: 'Price cannot be negative.' });
  }
  if (policy.maxLatencySeconds !== undefined && policy.maxLatencySeconds <= 0) {
    issues.push({ field: 'maxLatencySeconds', severity: 'error', message: 'Latency must be greater than zero.' });
  }
  if (policy.minThroughputTps !== undefined && policy.minThroughputTps <= 0) {
    issues.push({ field: 'minThroughputTps', severity: 'error', message: 'Throughput must be greater than zero.' });
  }
  if (policy.partition && !policy.sort) {
    issues.push({
      field: 'partition',
      severity: 'warning',
      message: 'Partition only applies with a sort strategy; it is ignored otherwise.',
    });
  }
  if (policy.localMaxCacheReadPerMillion !== undefined) {
    issues.push({
      field: 'localMaxCacheReadPerMillion',
      severity: 'warning',
      message:
        'A cache-read ceiling is a local preference: OpenRouter cannot enforce it in a routing request. It only flags providers here.',
    });
  }
  return issues;
}

/** A short, human summary for table badges. */
export function policySummary(policy: RoutingPolicy): string {
  const bits: string[] = [];
  if (policy.mode === 'only') bits.push(`only ${policy.providers.length}`);
  if (policy.mode === 'exclude') bits.push(`exclude ${policy.providers.length}`);
  if (policy.sort) bits.push(`sort ${policy.sort}`);
  if (policy.maxPromptPerMillion !== undefined) bits.push(`≤$${policy.maxPromptPerMillion}/M in`);
  if (policy.maxCompletionPerMillion !== undefined) bits.push(`≤$${policy.maxCompletionPerMillion}/M out`);
  if (policy.maxLatencySeconds !== undefined) bits.push(`≤${policy.maxLatencySeconds}s`);
  if (policy.minThroughputTps !== undefined) bits.push(`≥${policy.minThroughputTps} tok/s`);
  if (policy.allowFallbacks === false) bits.push('no fallbacks');
  if (policy.zdr) bits.push('ZDR');
  if (policy.requireParameters) bits.push('require params');
  return bits.length > 0 ? bits.join(' · ') : 'OpenRouter defaults';
}

/**
 * Plain-language statements of what a policy does, in the order a user reads
 * them. Used by the routing screen so the JSON never has to be decoded.
 */
export function describePolicy(policy: RoutingPolicy): string[] {
  const lines: string[] = [];
  const names = (slugs: string[]) => {
    if (slugs.length <= 3) return slugs.join(', ');
    return `${slugs.slice(0, 3).join(', ')} and ${slugs.length - 3} more`;
  };

  if (policy.mode === 'only' && policy.providers.length > 0) {
    lines.push(`Uses only ${names(policy.providers)}.`);
  }
  if (policy.mode === 'exclude' && policy.providers.length > 0) {
    lines.push(`Never uses ${names(policy.providers)}.`);
  }
  if (policy.order.length > 0) {
    lines.push(`Tries ${names(policy.order)} first, in that order.`);
  }
  if (policy.allowFallbacks === false) {
    lines.push('Does not fall back to other providers if the chosen ones fail.');
  }

  if (policy.sort === 'price') lines.push('Prefers the lowest price.');
  if (policy.sort === 'throughput') lines.push('Prefers the fastest output speed.');
  if (policy.sort === 'latency') lines.push('Prefers the shortest wait before the first token.');

  if (policy.maxPromptPerMillion !== undefined) {
    lines.push(`Skips providers charging more than $${policy.maxPromptPerMillion} per million input tokens.`);
  }
  if (policy.maxCompletionPerMillion !== undefined) {
    lines.push(`Skips providers charging more than $${policy.maxCompletionPerMillion} per million output tokens.`);
  }
  if (policy.maxImagePrice !== undefined) {
    lines.push(`Skips providers charging more than $${policy.maxImagePrice} per image.`);
  }
  if (policy.maxRequestPrice !== undefined) {
    lines.push(`Skips providers charging more than $${policy.maxRequestPrice} per request.`);
  }

  if (policy.maxLatencySeconds !== undefined) {
    lines.push(
      `Prefers providers that respond within ${policy.maxLatencySeconds} s (${(policy.maxLatencyPercentile ?? 'p50').toUpperCase()}).`,
    );
  }
  if (policy.minThroughputTps !== undefined) {
    lines.push(
      `Prefers providers that generate at least ${policy.minThroughputTps} tokens/s (${(policy.minThroughputPercentile ?? 'p50').toUpperCase()}).`,
    );
  }

  if (policy.quantizations && policy.quantizations.length > 0) {
    lines.push(`Only ${policy.quantizations.join(' or ')} quantization.`);
  }
  if (policy.dataCollection === 'deny') lines.push('Excludes providers that may store your data.');
  if (policy.zdr) lines.push('Uses only zero-data-retention providers.');
  if (policy.requireParameters) lines.push('Uses only providers that support every request parameter.');
  if (policy.enforceDistillableText) lines.push('Uses only models that allow text distillation.');

  return lines.length > 0 ? lines : ['No rules. OpenRouter chooses the provider.'];
}
