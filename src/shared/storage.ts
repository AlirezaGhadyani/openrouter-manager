import { fingerprint } from './config.ts';
import type { ModelSummary, EndpointInfo } from './api-types.ts';

/** The extension's own directory. The panel and the OpenCode plugin both resolve it. */
export const CONFIG_DIR = '~/.config/openrouter-manager';
export const CONFIG_PATH = `${CONFIG_DIR}/routing.json`;
export const STATUS_PATH = `${CONFIG_DIR}/runtime-status.json`;
export const CACHE_DIR = `${CONFIG_DIR}/cache`;
export const MODELS_CACHE_PATH = `${CACHE_DIR}/models.json`;
export const HISTORY_PATH = `${CACHE_DIR}/history.json`;

export function endpointCachePath(modelId: string): string {
  return `${CACHE_DIR}/endpoints/${fingerprint(modelId)}.json`;
}

/** `~` and `~/x` to an absolute path. Other paths are returned unchanged. */
export function expandHome(path: string, home: string): string {
  if (path === '~') return home;
  if (path.startsWith('~/')) return `${home.replace(/\/+$/, '')}${path.slice(1)}`;
  return path;
}

export interface StatusReport {
  pluginVersion: string;
  writtenAt: string;
  openCodeVersion?: string;
  configRevision?: number;
  configUpdatedAt?: string;
  configError?: string;
  appliedCount: number;
  lastApplied?: {
    at: string;
    requestKind?: string;
    providerID: string;
    modelID: string;
    routingKey: string;
    profileId: string | null;
    providerKeys: string[];
    provider: unknown;
  };
}

export interface ModelsCache {
  schemaVersion: 1;
  fetchedAt: string;
  models: ModelSummary[];
}

export interface EndpointsCache {
  schemaVersion: 1;
  fetchedAt: string;
  modelId: string;
  endpoints: EndpointInfo[];
}

export interface HistoryPoint {
  at: string;
  models: number;
  providers?: number;
  medianInputPerMillion: number | null;
  medianOutputPerMillion: number | null;
}

export interface HistoryCache {
  schemaVersion: 1;
  points: HistoryPoint[];
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finite(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseStatus(text: string): StatusReport | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const data = record(raw);
  if (!data || typeof data.pluginVersion !== 'string' || typeof data.writtenAt !== 'string') return null;
  const last = record(data.lastApplied);
  return {
    pluginVersion: data.pluginVersion,
    writtenAt: data.writtenAt,
    ...(typeof data.openCodeVersion === 'string' ? { openCodeVersion: data.openCodeVersion } : {}),
    ...(finite(data.configRevision) !== undefined ? { configRevision: finite(data.configRevision) } : {}),
    ...(typeof data.configUpdatedAt === 'string' ? { configUpdatedAt: data.configUpdatedAt } : {}),
    ...(typeof data.configError === 'string' ? { configError: data.configError } : {}),
    appliedCount: finite(data.appliedCount) ?? 0,
    ...(last
      ? {
          lastApplied: {
            at: typeof last.at === 'string' ? last.at : '',
            ...(typeof last.requestKind === 'string' ? { requestKind: last.requestKind } : {}),
            providerID: typeof last.providerID === 'string' ? last.providerID : '',
            modelID: typeof last.modelID === 'string' ? last.modelID : '',
            routingKey: typeof last.routingKey === 'string' ? last.routingKey : '',
            profileId: typeof last.profileId === 'string' ? last.profileId : null,
            providerKeys: Array.isArray(last.providerKeys)
              ? last.providerKeys.filter((key): key is string => typeof key === 'string')
              : [],
            provider: last.provider,
          },
        }
      : {}),
  };
}

export function parseModelsCache(text: string): ModelsCache | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const data = record(raw);
  if (!data || data.schemaVersion !== 1 || typeof data.fetchedAt !== 'string' || !Array.isArray(data.models)) {
    return null;
  }
  return data as unknown as ModelsCache;
}

export function parseEndpointsCache(text: string): EndpointsCache | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const data = record(raw);
  if (!data || data.schemaVersion !== 1 || typeof data.fetchedAt !== 'string' || !Array.isArray(data.endpoints)) {
    return null;
  }
  return data as unknown as EndpointsCache;
}

export function parseHistory(text: string): HistoryCache | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const data = record(raw);
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.points)) return null;
  const points: HistoryPoint[] = [];
  for (const point of data.points) {
    const entry = record(point);
    if (!entry || typeof entry.at !== 'string') continue;
    points.push({
      at: entry.at,
      models: finite(entry.models) ?? 0,
      ...(finite(entry.providers) !== undefined ? { providers: finite(entry.providers) } : {}),
      medianInputPerMillion: nullableNumber(entry.medianInputPerMillion),
      medianOutputPerMillion: nullableNumber(entry.medianOutputPerMillion),
    });
  }
  return { schemaVersion: 1, points };
}
