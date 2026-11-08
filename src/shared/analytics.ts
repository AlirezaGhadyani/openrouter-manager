import type { EndpointInfo, ModelSummary } from './api-types.ts';
import type { HistoryPoint } from './storage.ts';

export type EndpointsByModel = Readonly<Record<string, readonly EndpointInfo[]>>;

export interface ProviderStat {
  slug: string;
  name: string;
  endpoints: number;
  models: number;
  availableEndpoints: number;
  medianInputPerMillion: number | null;
  medianOutputPerMillion: number | null;
  bestInputPerMillion: number | null;
  bestOutputPerMillion: number | null;
  bestCacheReadPerMillion: number | null;
  cheapestInputWins: number;
  cheapestOutputWins: number;
  bestCacheWins: number;
  fastestWins: number;
  lowestLatencyWins: number;
  medianUptime30m: number | null;
}

export interface AnalyticsSummary {
  modelCount: number;
  modelsWithEndpoints: number;
  endpointCount: number;
  providerCount: number;
  providers: ProviderStat[];
  /** Per-model leaders, for the model table and detail highlights. */
  leaders: Record<
    string,
    {
      cheapestInput: string | null;
      cheapestOutput: string | null;
      bestCacheRead: string | null;
      fastestThroughput: string | null;
      lowestLatency: string | null;
    }
  >;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const a = sorted[middle - 1];
  const b = sorted[middle];
  return a === undefined || b === undefined ? null : (a + b) / 2;
}

function min(values: Array<number | null>): number | null {
  let best: number | null = null;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    if (best === null || value < best) best = value;
  }
  return best;
}

function max(values: Array<number | null>): number | null {
  let best: number | null = null;
  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    if (best === null || value > best) best = value;
  }
  return best;
}

function providerSlug(endpoint: EndpointInfo): string {
  return endpoint.tag.split('/')[0] ?? endpoint.tag;
}

/** Per-model leaders and provider rollups over the endpoint data that is loaded. */
export function buildAnalytics(
  models: readonly ModelSummary[],
  endpointsByModel: EndpointsByModel,
): AnalyticsSummary {
  const byProvider = new Map<
    string,
    {
      name: string;
      endpoints: EndpointInfo[];
      models: Set<string>;
    }
  >();
  const leaders: AnalyticsSummary['leaders'] = {};
  let endpointCount = 0;
  let modelsWithEndpoints = 0;

  for (const model of models) {
    const endpoints = endpointsByModel[model.id];
    if (!endpoints || endpoints.length === 0) continue;
    modelsWithEndpoints++;
    endpointCount += endpoints.length;

    let cheapestInput: EndpointInfo | null = null;
    let cheapestOutput: EndpointInfo | null = null;
    let bestCache: EndpointInfo | null = null;
    let fastest: EndpointInfo | null = null;
    let lowestLatency: EndpointInfo | null = null;

    for (const endpoint of endpoints) {
      const slug = providerSlug(endpoint);
      const entry = byProvider.get(slug) ?? { name: endpoint.providerName, endpoints: [], models: new Set<string>() };
      entry.endpoints.push(endpoint);
      entry.models.add(model.id);
      byProvider.set(slug, entry);

      if (
        endpoint.inputPerMillion !== null &&
        (cheapestInput === null ||
          endpoint.inputPerMillion < (cheapestInput.inputPerMillion ?? Infinity))
      ) {
        cheapestInput = endpoint;
      }
      if (
        endpoint.outputPerMillion !== null &&
        (cheapestOutput === null ||
          endpoint.outputPerMillion < (cheapestOutput.outputPerMillion ?? Infinity))
      ) {
        cheapestOutput = endpoint;
      }
      if (
        endpoint.cacheReadPerMillion !== null &&
        (bestCache === null ||
          endpoint.cacheReadPerMillion < (bestCache.cacheReadPerMillion ?? Infinity))
      ) {
        bestCache = endpoint;
      }
      const throughput = endpoint.throughputTps?.p50;
      if (
        throughput !== undefined &&
        (fastest === null || throughput > (fastest.throughputTps?.p50 ?? -Infinity))
      ) {
        fastest = endpoint;
      }
      const latency = endpoint.latencyMs?.p50;
      if (
        latency !== undefined &&
        (lowestLatency === null || latency < (lowestLatency.latencyMs?.p50 ?? Infinity))
      ) {
        lowestLatency = endpoint;
      }
    }

    leaders[model.id] = {
      cheapestInput: cheapestInput?.tag ?? null,
      cheapestOutput: cheapestOutput?.tag ?? null,
      bestCacheRead: bestCache?.tag ?? null,
      fastestThroughput: fastest?.tag ?? null,
      lowestLatency: lowestLatency?.tag ?? null,
    };
  }

  const providers: ProviderStat[] = [];
  for (const [slug, entry] of byProvider) {
    const winCount = (tag: string | null | undefined) =>
      tag && providerSlugOf(tag) === slug ? 1 : 0;
    let cheapestInputWins = 0;
    let cheapestOutputWins = 0;
    let bestCacheWins = 0;
    let fastestWins = 0;
    let lowestLatencyWins = 0;
    for (const leader of Object.values(leaders)) {
      cheapestInputWins += winCount(leader.cheapestInput);
      cheapestOutputWins += winCount(leader.cheapestOutput);
      bestCacheWins += winCount(leader.bestCacheRead);
      fastestWins += winCount(leader.fastestThroughput);
      lowestLatencyWins += winCount(leader.lowestLatency);
    }
    providers.push({
      slug,
      name: entry.name,
      endpoints: entry.endpoints.length,
      models: entry.models.size,
      availableEndpoints: entry.endpoints.filter((endpoint) => endpoint.available).length,
      medianInputPerMillion: median(
        entry.endpoints.flatMap((endpoint) => (endpoint.inputPerMillion === null ? [] : [endpoint.inputPerMillion])),
      ),
      medianOutputPerMillion: median(
        entry.endpoints.flatMap((endpoint) => (endpoint.outputPerMillion === null ? [] : [endpoint.outputPerMillion])),
      ),
      bestInputPerMillion: min(entry.endpoints.map((endpoint) => endpoint.inputPerMillion)),
      bestOutputPerMillion: min(entry.endpoints.map((endpoint) => endpoint.outputPerMillion)),
      bestCacheReadPerMillion: min(entry.endpoints.map((endpoint) => endpoint.cacheReadPerMillion)),
      cheapestInputWins,
      cheapestOutputWins,
      bestCacheWins,
      fastestWins,
      lowestLatencyWins,
      medianUptime30m: median(
        entry.endpoints.flatMap((endpoint) => (endpoint.uptime30m === null ? [] : [endpoint.uptime30m])),
      ),
    });
  }

  providers.sort((a, b) => b.models - a.models || a.name.localeCompare(b.name));

  return {
    modelCount: models.length,
    modelsWithEndpoints,
    endpointCount,
    providerCount: providers.length,
    providers,
    leaders,
  };
}

function providerSlugOf(tag: string): string {
  return tag.split('/')[0] ?? tag;
}

/** A compact point for the local, explicitly-labelled history chart. */
export function buildHistoryPoint(
  models: readonly ModelSummary[],
  endpointsByModel: EndpointsByModel,
  now: number = Date.now(),
): HistoryPoint {
  const inputs = models.flatMap((model) => (model.inputPerMillion === null ? [] : [model.inputPerMillion]));
  const outputs = models.flatMap((model) => (model.outputPerMillion === null ? [] : [model.outputPerMillion]));
  const providers = new Set<string>();
  for (const endpoints of Object.values(endpointsByModel)) {
    for (const endpoint of endpoints) providers.add(providerSlug(endpoint));
  }
  return {
    at: new Date(now).toISOString(),
    models: models.length,
    ...(providers.size > 0 ? { providers: providers.size } : {}),
    medianInputPerMillion: median(inputs),
    medianOutputPerMillion: median(outputs),
  };
}
