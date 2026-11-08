import type { EndpointInfo, ModelSummary } from '../shared/api-types.ts';
import { buildHistoryPoint } from '../shared/analytics.ts';
import type { EndpointsByModel } from '../shared/analytics.ts';
import {
  createDefaultConfig,
  fingerprint,
  parseConfig,
  serializeConfig,
  type ParseResult,
} from '../shared/config.ts';
import {
  CONFIG_PATH,
  HISTORY_PATH,
  MODELS_CACHE_PATH,
  STATUS_PATH,
  endpointCachePath,
  parseEndpointsCache,
  parseHistory,
  parseModelsCache,
  parseStatus,
  type EndpointsCache,
  type HistoryCache,
  type ModelsCache,
  type StatusReport,
} from '../shared/storage.ts';
import { CONFIG_SCHEMA_VERSION } from '../shared/types.ts';
import type { ManagerConfig, ValidationIssue } from '../shared/types.ts';
import { OpenRouterClient } from './client.ts';
import { readText, writeText } from './files.ts';
import type { PanelHost } from './host.ts';

export const MODEL_TTL_MS = 6 * 60 * 60 * 1000;
export const ENDPOINT_TTL_MS = 10 * 60 * 1000;
const HISTORY_LIMIT = 120;
const HISTORY_MIN_GAP_MS = 60 * 60 * 1000;

export interface ConfigSnapshot {
  config: ManagerConfig;
  text: string;
  fingerprint: string;
  issues: ValidationIssue[];
  migratedFrom?: number;
  readOnly: boolean;
}

export class ConfigFileError extends Error {
  readonly issues: ValidationIssue[];
  readonly rawText: string;
  readonly readOnly: boolean;

  constructor(message: string, issues: ValidationIssue[], rawText: string, readOnly = false) {
    super(message);
    this.name = 'ConfigFileError';
    this.issues = issues;
    this.rawText = rawText;
    this.readOnly = readOnly;
  }
}

export class ConfigConflictError extends Error {
  readonly currentText: string;

  constructor(currentText: string) {
    super('The configuration file changed outside this panel.');
    this.name = 'ConfigConflictError';
    this.currentText = currentText;
  }
}

export interface CatalogResult {
  models: ModelSummary[];
  fetchedAt: string;
  fromCache: boolean;
  stale: boolean;
  error?: string;
}

export interface EndpointsResult {
  endpoints: EndpointInfo[];
  fetchedAt: string;
  fromCache: boolean;
  stale: boolean;
  error?: string;
}

export class Repository {
  readonly client: OpenRouterClient;

  constructor(
    private readonly host: PanelHost,
    private readonly now: () => number = Date.now,
  ) {
    this.client = new OpenRouterClient(host);
  }

  private async readConfigText(): Promise<string | null> {
    return readText(this.host, CONFIG_PATH);
  }

  async loadConfig(): Promise<ConfigSnapshot> {
    const text = await this.readConfigText();
    if (text === null) {
      const config = createDefaultConfig(this.now());
      const created = serializeConfig(config);
      await writeText(this.host, CONFIG_PATH, created);
      return {
        config,
        text: created,
        fingerprint: fingerprint(created),
        issues: [],
        readOnly: false,
      };
    }
    const parsed: ParseResult = parseConfig(text, this.now());
    if (!parsed.ok || !parsed.config) {
      throw new ConfigFileError(
        parsed.issues[0]?.message ?? 'The configuration file could not be read.',
        parsed.issues,
        text,
        parsed.readOnly,
      );
    }
    return {
      config: parsed.config,
      text,
      fingerprint: fingerprint(text),
      issues: parsed.issues,
      readOnly: parsed.readOnly,
      ...(parsed.migratedFrom !== undefined ? { migratedFrom: parsed.migratedFrom } : {}),
    };
  }

  /** Re-read the file and compare; used to detect a change under the panel. */
  async currentFingerprint(): Promise<{ text: string | null; fingerprint: string | null }> {
    const text = await this.readConfigText();
    return { text, fingerprint: text === null ? null : fingerprint(text) };
  }

  async backup(text: string, label = 'backup'): Promise<string> {
    const stamp = new Date(this.now()).toISOString().replace(/[:.]/g, '-');
    const path = `${CONFIG_PATH.replace(/\/[^/]+$/, '')}/routing.${label}-${stamp}.json`;
    await writeText(this.host, path, text);
    return path;
  }

  async saveConfig(config: ManagerConfig, expectedFingerprint: string | null): Promise<ConfigSnapshot> {
    const current = await this.readConfigText();
    if (current !== null && expectedFingerprint !== null && fingerprint(current) !== expectedFingerprint) {
      throw new ConfigConflictError(current);
    }
    const next: ManagerConfig = {
      ...config,
      schemaVersion: CONFIG_SCHEMA_VERSION,
      revision: config.revision + 1,
      updatedAt: new Date(this.now()).toISOString(),
    };
    const text = serializeConfig(next);
    await writeText(this.host, CONFIG_PATH, text);
    return {
      config: next,
      text,
      fingerprint: fingerprint(text),
      issues: [],
      readOnly: false,
    };
  }

  async resetConfig(rawText: string | null): Promise<ConfigSnapshot> {
    if (rawText) await this.backup(rawText, 'backup');
    const config = createDefaultConfig(this.now());
    const text = serializeConfig(config);
    await writeText(this.host, CONFIG_PATH, text);
    return {
      config,
      text,
      fingerprint: fingerprint(text),
      issues: [],
      readOnly: false,
    };
  }

  async loadCatalog(force = false): Promise<CatalogResult> {
    const cachedText = await readText(this.host, MODELS_CACHE_PATH);
    const cached = cachedText ? parseModelsCache(cachedText) : null;
    const age = cached ? this.now() - Date.parse(cached.fetchedAt) : Number.POSITIVE_INFINITY;
    if (!force && cached && cached.models.length > 0 && age >= 0 && age < MODEL_TTL_MS) {
      return {
        models: cached.models,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
        stale: false,
      };
    }

    try {
      const models = await this.client.listModels();
      const cache: ModelsCache = {
        schemaVersion: 1,
        fetchedAt: new Date(this.now()).toISOString(),
        models,
      };
      try {
        await writeText(this.host, MODELS_CACHE_PATH, JSON.stringify(cache));
      } catch {
        // A cache write failure must not hide a fresh catalog.
      }
      await this.appendHistory(models).catch(() => undefined);
      return {
        models,
        fetchedAt: cache.fetchedAt,
        fromCache: false,
        stale: false,
      };
    } catch (error) {
      if (cached && cached.models.length > 0) {
        return {
          models: cached.models,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          stale: true,
          error: error instanceof Error ? error.message : 'Could not refresh the catalog.',
        };
      }
      throw error;
    }
  }

  async loadEndpoints(model: ModelSummary, force = false): Promise<EndpointsResult> {
    const path = endpointCachePath(model.id);
    const cachedText = await readText(this.host, path);
    const cached = cachedText ? parseEndpointsCache(cachedText) : null;
    const age = cached ? this.now() - Date.parse(cached.fetchedAt) : Number.POSITIVE_INFINITY;
    if (!force && cached && age >= 0 && age < ENDPOINT_TTL_MS) {
      return {
        endpoints: cached.endpoints,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
        stale: false,
      };
    }

    try {
      const result = await this.client.listEndpoints(model);
      const fetchedAt = new Date(this.now()).toISOString();
      const cache: EndpointsCache = {
        schemaVersion: 1,
        fetchedAt,
        modelId: result.modelId ?? model.id,
        endpoints: result.endpoints,
      };
      try {
        await writeText(this.host, path, JSON.stringify(cache));
      } catch {
        // Keep the fresh answer even when the cache cannot be written.
      }
      return { endpoints: result.endpoints, fetchedAt, fromCache: false, stale: false };
    } catch (error) {
      if (cached) {
        return {
          endpoints: cached.endpoints,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
          stale: true,
          error: error instanceof Error ? error.message : 'Could not refresh endpoint data.',
        };
      }
      throw error;
    }
  }

  async readStatus(): Promise<StatusReport | null> {
    const text = await readText(this.host, STATUS_PATH);
    return text ? parseStatus(text) : null;
  }

  async readHistory(): Promise<HistoryCache | null> {
    const text = await readText(this.host, HISTORY_PATH);
    return text ? parseHistory(text) : null;
  }

  async appendHistory(models: readonly ModelSummary[], endpointsByModel: EndpointsByModel = {}): Promise<void> {
    const existing = (await this.readHistory()) ?? { schemaVersion: 1 as const, points: [] };
    const now = this.now();
    const last = existing.points[existing.points.length - 1];
    if (last && now - Date.parse(last.at) < HISTORY_MIN_GAP_MS) return;
    const point = buildHistoryPoint(models, endpointsByModel, now);
    const points = [...existing.points, point].slice(-HISTORY_LIMIT);
    await writeText(this.host, HISTORY_PATH, JSON.stringify({ schemaVersion: 1, points }));
  }
}
