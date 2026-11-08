import {
  CONFIG_SCHEMA_VERSION,
  type ManagerConfig,
  type ManagerSettings,
  type ModelRouting,
  type PolicyOverride,
  type RoutingPolicy,
  type RoutingProfile,
  type ValidationIssue,
} from './types.ts';
import {
  cleanProviders,
  emptyPolicy,
  mergePolicy,
  sanitizePolicy,
  OPTIONAL_POLICY_KEYS,
  PERCENTILES,
  SORT_BYS,
} from './policy.ts';

function iso(now: number): string {
  return new Date(now).toISOString();
}

function profile(id: string, name: string, description: string, policy: Partial<RoutingProfile['policy']>, now: number): RoutingProfile {
  return {
    id,
    name,
    description,
    builtin: true,
    policy: sanitizePolicy({ ...emptyPolicy(), ...policy }),
    createdAt: iso(now),
    updatedAt: iso(now),
  };
}

/** Profiles every new install starts with. They are ordinary editable profiles. */
export function builtinProfiles(now: number = Date.now()): RoutingProfile[] {
  return [
    profile('cheapest', 'Cheapest', 'Lowest published price first.', { sort: 'price' }, now),
    profile('fastest', 'Fastest', 'Highest measured throughput first.', { sort: 'throughput' }, now),
    profile('low-latency', 'Low latency', 'Lowest time to first token first.', { sort: 'latency' }, now),
    profile(
      'balanced',
      'Balanced',
      'Cheapest provider that still reports at least 30 tokens/sec at the median.',
      { sort: 'price', minThroughputTps: 30, minThroughputPercentile: 'p50' },
      now,
    ),
    profile('custom', 'Custom', 'Start from OpenRouter defaults and configure every knob.', {}, now),
  ];
}

export function defaultSettings(): ManagerSettings {
  return { enabled: true, defaultProfileId: 'balanced', providerIds: ['openrouter'] };
}

export function createDefaultConfig(now: number = Date.now()): ManagerConfig {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    revision: 0,
    updatedAt: iso(now),
    settings: defaultSettings(),
    profiles: builtinProfiles(now),
    models: {},
    aliases: {},
  };
}

const MODEL_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/;
const PROFILE_ID = /^[a-z0-9][a-z0-9._-]*$/;
const PROVIDER_ID = /^[a-z0-9][a-z0-9._-]*$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Sanitize a partial override without filling in defaults. */
export function sanitizeOverride(input: unknown): PolicyOverride {
  const raw = asRecord(input);
  if (!raw) return {};
  const out: PolicyOverride = {};
  for (const key of OPTIONAL_POLICY_KEYS) {
    if (raw[key] === null) (out as Record<string, unknown>)[key] = null;
  }

  if (raw.mode === 'all' || raw.mode === 'only' || raw.mode === 'exclude') out.mode = raw.mode;
  if (raw.providers !== undefined) out.providers = cleanProviders(raw.providers);
  if (raw.order !== undefined) out.order = cleanProviders(raw.order);
  if (typeof raw.allowFallbacks === 'boolean') out.allowFallbacks = raw.allowFallbacks;

  for (const key of ['maxPromptPerMillion', 'maxCompletionPerMillion', 'maxImagePrice', 'maxRequestPrice'] as const) {
    const value = raw[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) out[key] = value;
  }
  if (typeof raw.sort === 'string' && (SORT_BYS as readonly string[]).includes(raw.sort)) {
    out.sort = raw.sort as PolicyOverride['sort'];
  }
  if (raw.partition === 'model' || raw.partition === 'none') out.partition = raw.partition;
  if (typeof raw.maxLatencySeconds === 'number' && Number.isFinite(raw.maxLatencySeconds) && raw.maxLatencySeconds > 0) {
    out.maxLatencySeconds = raw.maxLatencySeconds;
    out.maxLatencyPercentile =
      typeof raw.maxLatencyPercentile === 'string' &&
      (PERCENTILES as readonly string[]).includes(raw.maxLatencyPercentile)
        ? (raw.maxLatencyPercentile as PolicyOverride['maxLatencyPercentile'])
        : 'p50';
  }
  if (typeof raw.minThroughputTps === 'number' && Number.isFinite(raw.minThroughputTps) && raw.minThroughputTps > 0) {
    out.minThroughputTps = raw.minThroughputTps;
    out.minThroughputPercentile =
      typeof raw.minThroughputPercentile === 'string' &&
      (PERCENTILES as readonly string[]).includes(raw.minThroughputPercentile)
        ? (raw.minThroughputPercentile as PolicyOverride['minThroughputPercentile'])
        : 'p50';
  }
  if (Array.isArray(raw.quantizations)) {
    // An empty array is meaningful: it removes the profile's quantization list.
    out.quantizations = cleanProviders(raw.quantizations);
  }
  if (raw.dataCollection === 'allow' || raw.dataCollection === 'deny') out.dataCollection = raw.dataCollection;
  if (raw.zdr === true) out.zdr = true;
  if (raw.requireParameters === true) out.requireParameters = true;
  if (raw.enforceDistillableText === true) out.enforceDistillableText = true;
  if (
    typeof raw.localMaxCacheReadPerMillion === 'number' &&
    Number.isFinite(raw.localMaxCacheReadPerMillion) &&
    raw.localMaxCacheReadPerMillion >= 0
  ) {
    out.localMaxCacheReadPerMillion = raw.localMaxCacheReadPerMillion;
  }
  return out;
}

export function sanitizeProfile(input: unknown, now: number): RoutingProfile | null {
  const raw = asRecord(input);
  if (!raw) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim().toLowerCase() : '';
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 80) : '';
  if (!PROFILE_ID.test(id) || !name) return null;
  return {
    id,
    name,
    description:
      typeof raw.description === 'string' ? raw.description.trim().slice(0, 240) : '',
    builtin: raw.builtin === true,
    policy: sanitizePolicy(raw.policy),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : iso(now),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : iso(now),
  };
}

export interface ParseResult {
  ok: boolean;
  config: ManagerConfig | null;
  issues: ValidationIssue[];
  /** The file was written by a newer schema; it must not be overwritten. */
  readOnly: boolean;
  migratedFrom?: number;
}

function invalid(message: string): ParseResult {
  return {
    ok: false,
    config: null,
    issues: [{ field: 'file', severity: 'error', message }],
    readOnly: false,
  };
}

/**
 * Parse and repair a config file. Unknown fields are dropped; a profile a model
 * points at that no longer exists falls back to the model's overrides alone.
 */
export function parseConfig(text: string, now: number = Date.now()): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return invalid('The configuration file is not valid JSON.');
  }
  const record = asRecord(raw);
  if (!record) return invalid('The configuration file must contain a JSON object.');

  const version = typeof record.schemaVersion === 'number' ? record.schemaVersion : 0;
  if (version > CONFIG_SCHEMA_VERSION) {
    return {
      ok: false,
      config: null,
      readOnly: true,
      issues: [
        {
          field: 'schemaVersion',
          severity: 'error',
          message: `This file uses schema ${version}; this extension understands ${CONFIG_SCHEMA_VERSION}. Update the extension instead of overwriting it.`,
        },
      ],
    };
  }

  const issues: ValidationIssue[] = [];
  let migratedFrom: number | undefined;
  let source = record;
  if (version < CONFIG_SCHEMA_VERSION) {
    migratedFrom = version;
    source = migrateV0(record, now);
    issues.push({
      field: 'schemaVersion',
      severity: 'warning',
      message: `Migrated the configuration from schema ${version} to ${CONFIG_SCHEMA_VERSION}.`,
    });
  }

  const settingsRaw = asRecord(source.settings) ?? {};
  const providerIds = Array.isArray(settingsRaw.providerIds)
    ? settingsRaw.providerIds
        .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : ''))
        .filter((value) => PROVIDER_ID.test(value))
    : [];
  const settings: ManagerSettings = {
    enabled: settingsRaw.enabled !== false,
    defaultProfileId:
      typeof settingsRaw.defaultProfileId === 'string' ? settingsRaw.defaultProfileId : null,
    providerIds: providerIds.length > 0 ? [...new Set(providerIds)] : ['openrouter'],
  };

  const profiles: RoutingProfile[] = [];
  const profileIds = new Set<string>();
  if (Array.isArray(source.profiles)) {
    for (const entry of source.profiles) {
      const parsed = sanitizeProfile(entry, now);
      if (!parsed) {
        issues.push({ field: 'profiles', severity: 'warning', message: 'Dropped a profile with an invalid id or name.' });
        continue;
      }
      if (profileIds.has(parsed.id)) continue;
      profileIds.add(parsed.id);
      profiles.push(parsed);
    }
  }
  if (profiles.length === 0) profiles.push(...builtinProfiles(now));

  if (settings.defaultProfileId && !profileIds.has(settings.defaultProfileId)) {
    issues.push({
      field: 'settings.defaultProfileId',
      severity: 'warning',
      message: 'The default profile no longer exists; no default is selected.',
    });
    settings.defaultProfileId = null;
  }
  if (!settings.defaultProfileId) settings.defaultProfileId = profiles[0]?.id ?? null;

  const models: Record<string, ModelRouting> = {};
  const modelsRaw = asRecord(source.models);
  if (modelsRaw) {
    for (const [key, value] of Object.entries(modelsRaw)) {
      const modelKey = key.trim();
      if (!MODEL_KEY.test(modelKey)) {
        issues.push({ field: 'models', severity: 'warning', message: `Dropped model entry "${key}".` });
        continue;
      }
      const entry = asRecord(value);
      if (!entry) continue;
      let profileId = typeof entry.profileId === 'string' ? entry.profileId : null;
      if (profileId && !profileIds.has(profileId)) {
        issues.push({
          field: `models.${modelKey}.profileId`,
          severity: 'warning',
          message: `Model "${modelKey}" pointed at missing profile "${profileId}"; its overrides remain.`,
        });
        profileId = null;
      }
      models[modelKey] = {
        profileId,
        overrides: sanitizeOverride(entry.overrides),
        customized: entry.customized !== false,
        updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : iso(now),
      };
    }
  }

  const aliases: Record<string, string> = {};
  const aliasesRaw = asRecord(source.aliases);
  if (aliasesRaw) {
    for (const [key, value] of Object.entries(aliasesRaw)) {
      if (typeof value !== 'string') continue;
      const from = key.trim();
      const to = value.trim();
      if (!from || !to || from === to || !MODEL_KEY.test(from) || !MODEL_KEY.test(to)) continue;
      aliases[from] = to;
    }
  }

  const revision =
    typeof source.revision === 'number' && Number.isFinite(source.revision) && source.revision >= 0
      ? Math.floor(source.revision)
      : 0;

  const config: ManagerConfig = {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    revision,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : iso(now),
    settings,
    profiles,
    models,
    aliases,
  };

  return { ok: true, config, issues, readOnly: false, ...(migratedFrom !== undefined ? { migratedFrom } : {}) };
}

/**
 * Schema 0 is the pre-release shape: the same keys without `schemaVersion`.
 * Kept small and idempotent so a future migration has a template.
 */
function migrateV0(record: Record<string, unknown>, _now: number): Record<string, unknown> {
  return { ...record, schemaVersion: CONFIG_SCHEMA_VERSION };
}

export function serializeConfig(config: ManagerConfig): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

/** FNV-1a 32-bit, enough to notice a file changed under the panel. */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function findProfile(config: ManagerConfig, id: string | null | undefined): RoutingProfile | null {
  if (!id) return null;
  return config.profiles.find((profile) => profile.id === id) ?? null;
}

/** The effective policy for a routing key, or `null` when the model has none. */
export function effectivePolicy(config: ManagerConfig, routingKey: string): {
  policy: ReturnType<typeof emptyPolicy>;
  profileId: string | null;
} | null {
  const entry = config.models[routingKey];
  if (!entry) return null;
  const profile = findProfile(config, entry.profileId);
  const base = profile ? profile.policy : emptyPolicy();
  return { policy: mergePolicy(base, entry.overrides), profileId: entry.profileId };
}

export function countCustomModels(config: ManagerConfig): number {
  return Object.keys(config.models).length;
}

export function countExcludedProviders(config: ManagerConfig): number {
  const excluded = new Set<string>();
  for (const key of Object.keys(config.models)) {
    const resolved = effectivePolicy(config, key);
    if (!resolved || resolved.policy.mode !== 'exclude') continue;
    for (const slug of resolved.policy.providers) excluded.add(slug);
  }
  return excluded.size;
}
