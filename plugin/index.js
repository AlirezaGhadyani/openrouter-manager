// src/shared/types.ts
var CONFIG_SCHEMA_VERSION = 1;

// src/shared/policy.ts
var PERCENTILES = ["p50", "p75", "p90", "p99"];
var SORT_BYS = ["price", "latency", "throughput"];
var PROVIDER_MODES = ["all", "only", "exclude"];
var PROVIDER_SLUG = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)*$/;
function emptyPolicy() {
  return { mode: "all", providers: [], order: [], allowFallbacks: true };
}
function clonePolicy(policy) {
  return {
    ...policy,
    providers: [...policy.providers],
    order: [...policy.order],
    ...policy.quantizations ? { quantizations: [...policy.quantizations] } : {}
  };
}
function cleanSlug(value) {
  if (typeof value !== "string") return null;
  const slug = value.trim().toLowerCase();
  return slug && PROVIDER_SLUG.test(slug) ? slug : null;
}
function cleanProviders(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const item of value) {
    const slug = cleanSlug(item);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      result.push(slug);
    }
  }
  return result;
}
function positive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : void 0;
}
function nonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
function oneOf(value, allowed) {
  return typeof value === "string" && allowed.includes(value) ? value : void 0;
}
function sanitizePolicy(input, fallback = emptyPolicy()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return clonePolicy(fallback);
  const raw = input;
  const policy = {
    mode: oneOf(raw.mode, PROVIDER_MODES) ?? fallback.mode,
    providers: raw.providers === void 0 ? [...fallback.providers] : cleanProviders(raw.providers),
    order: raw.order === void 0 ? [...fallback.order] : cleanProviders(raw.order),
    allowFallbacks: typeof raw.allowFallbacks === "boolean" ? raw.allowFallbacks : fallback.allowFallbacks
  };
  const maxPrompt = nonNegative(raw.maxPromptPerMillion);
  if (maxPrompt !== void 0) policy.maxPromptPerMillion = maxPrompt;
  const maxCompletion = nonNegative(raw.maxCompletionPerMillion);
  if (maxCompletion !== void 0) policy.maxCompletionPerMillion = maxCompletion;
  const maxImage = nonNegative(raw.maxImagePrice);
  if (maxImage !== void 0) policy.maxImagePrice = maxImage;
  const maxRequest = nonNegative(raw.maxRequestPrice);
  if (maxRequest !== void 0) policy.maxRequestPrice = maxRequest;
  const sort = oneOf(raw.sort, SORT_BYS);
  if (sort) policy.sort = sort;
  const partition = oneOf(raw.partition, ["model", "none"]);
  if (partition && sort) policy.partition = partition;
  const latency = positive(raw.maxLatencySeconds);
  const latencyPercentile = oneOf(raw.maxLatencyPercentile, PERCENTILES);
  if (latency !== void 0) {
    policy.maxLatencySeconds = latency;
    policy.maxLatencyPercentile = latencyPercentile ?? "p50";
  }
  const throughput = positive(raw.minThroughputTps);
  const throughputPercentile = oneOf(raw.minThroughputPercentile, PERCENTILES);
  if (throughput !== void 0) {
    policy.minThroughputTps = throughput;
    policy.minThroughputPercentile = throughputPercentile ?? "p50";
  }
  const quantizations = cleanProviders(raw.quantizations);
  if (quantizations.length > 0) policy.quantizations = quantizations;
  const dataCollection = oneOf(raw.dataCollection, ["allow", "deny"]);
  if (dataCollection) policy.dataCollection = dataCollection;
  if (raw.zdr === true) policy.zdr = true;
  if (raw.requireParameters === true) policy.requireParameters = true;
  if (raw.enforceDistillableText === true) policy.enforceDistillableText = true;
  const localCache = nonNegative(raw.localMaxCacheReadPerMillion);
  if (localCache !== void 0) policy.localMaxCacheReadPerMillion = localCache;
  return policy;
}
var OPTIONAL_POLICY_KEYS = [
  "maxPromptPerMillion",
  "maxCompletionPerMillion",
  "maxImagePrice",
  "maxRequestPrice",
  "sort",
  "partition",
  "maxLatencySeconds",
  "maxLatencyPercentile",
  "minThroughputTps",
  "minThroughputPercentile",
  "quantizations",
  "dataCollection",
  "zdr",
  "requireParameters",
  "enforceDistillableText",
  "localMaxCacheReadPerMillion"
];
function mergePolicy(base, override) {
  const merged = clonePolicy(base);
  if (!override) return merged;
  const record = override;
  if (override.mode !== void 0 && override.mode !== null) merged.mode = override.mode;
  if (override.providers !== void 0 && override.providers !== null) {
    merged.providers = cleanProviders(override.providers);
  }
  if (override.order !== void 0 && override.order !== null) {
    merged.order = cleanProviders(override.order);
  }
  if (override.allowFallbacks !== void 0 && override.allowFallbacks !== null) {
    merged.allowFallbacks = override.allowFallbacks;
  }
  for (const key of OPTIONAL_POLICY_KEYS) {
    if (record[key] === null) delete merged[key];
  }
  const candidate = { ...merged };
  for (const key of OPTIONAL_POLICY_KEYS) {
    const value = record[key];
    if (value !== void 0 && value !== null) candidate[key] = value;
  }
  return sanitizePolicy(candidate, merged);
}
function policyToProvider(policy) {
  const out = {};
  const providers = cleanProviders(policy.providers);
  if (policy.mode === "only" && providers.length > 0) out.only = providers;
  if (policy.mode === "exclude" && providers.length > 0) out.ignore = providers;
  const order = cleanProviders(policy.order);
  if (order.length > 0) out.order = order;
  if (policy.allowFallbacks === false) out.allow_fallbacks = false;
  if (policy.sort && SORT_BYS.includes(policy.sort)) {
    if (policy.partition === "model" || policy.partition === "none") {
      out.sort = { by: policy.sort, partition: policy.partition };
    } else {
      out.sort = policy.sort;
    }
  }
  const maxPrice = {};
  if (policy.maxPromptPerMillion !== void 0) maxPrice.prompt = policy.maxPromptPerMillion;
  if (policy.maxCompletionPerMillion !== void 0) maxPrice.completion = policy.maxCompletionPerMillion;
  if (policy.maxImagePrice !== void 0) maxPrice.image = policy.maxImagePrice;
  if (policy.maxRequestPrice !== void 0) maxPrice.request = policy.maxRequestPrice;
  if (Object.keys(maxPrice).length > 0) out.max_price = maxPrice;
  if (policy.maxLatencySeconds !== void 0) {
    out.preferred_max_latency = {
      [policy.maxLatencyPercentile ?? "p50"]: policy.maxLatencySeconds
    };
  }
  if (policy.minThroughputTps !== void 0) {
    out.preferred_min_throughput = {
      [policy.minThroughputPercentile ?? "p50"]: policy.minThroughputTps
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

// src/shared/config.ts
function iso(now) {
  return new Date(now).toISOString();
}
function profile(id, name, description, policy, now) {
  return {
    id,
    name,
    description,
    builtin: true,
    policy: sanitizePolicy({ ...emptyPolicy(), ...policy }),
    createdAt: iso(now),
    updatedAt: iso(now)
  };
}
function builtinProfiles(now = Date.now()) {
  return [
    profile("cheapest", "Cheapest", "Lowest published price first.", { sort: "price" }, now),
    profile("fastest", "Fastest", "Highest measured throughput first.", { sort: "throughput" }, now),
    profile("low-latency", "Low latency", "Lowest time to first token first.", { sort: "latency" }, now),
    profile(
      "balanced",
      "Balanced",
      "Cheapest provider that still reports at least 30 tokens/sec at the median.",
      { sort: "price", minThroughputTps: 30, minThroughputPercentile: "p50" },
      now
    ),
    profile("custom", "Custom", "Start from OpenRouter defaults and configure every knob.", {}, now)
  ];
}
var MODEL_KEY = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]*$/;
var PROFILE_ID = /^[a-z0-9][a-z0-9._-]*$/;
var PROVIDER_ID = /^[a-z0-9][a-z0-9._-]*$/;
function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function sanitizeOverride(input) {
  const raw = asRecord(input);
  if (!raw) return {};
  const out = {};
  for (const key of OPTIONAL_POLICY_KEYS) {
    if (raw[key] === null) out[key] = null;
  }
  if (raw.mode === "all" || raw.mode === "only" || raw.mode === "exclude") out.mode = raw.mode;
  if (raw.providers !== void 0) out.providers = cleanProviders(raw.providers);
  if (raw.order !== void 0) out.order = cleanProviders(raw.order);
  if (typeof raw.allowFallbacks === "boolean") out.allowFallbacks = raw.allowFallbacks;
  for (const key of ["maxPromptPerMillion", "maxCompletionPerMillion", "maxImagePrice", "maxRequestPrice"]) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) out[key] = value;
  }
  if (typeof raw.sort === "string" && SORT_BYS.includes(raw.sort)) {
    out.sort = raw.sort;
  }
  if (raw.partition === "model" || raw.partition === "none") out.partition = raw.partition;
  if (typeof raw.maxLatencySeconds === "number" && Number.isFinite(raw.maxLatencySeconds) && raw.maxLatencySeconds > 0) {
    out.maxLatencySeconds = raw.maxLatencySeconds;
    out.maxLatencyPercentile = typeof raw.maxLatencyPercentile === "string" && PERCENTILES.includes(raw.maxLatencyPercentile) ? raw.maxLatencyPercentile : "p50";
  }
  if (typeof raw.minThroughputTps === "number" && Number.isFinite(raw.minThroughputTps) && raw.minThroughputTps > 0) {
    out.minThroughputTps = raw.minThroughputTps;
    out.minThroughputPercentile = typeof raw.minThroughputPercentile === "string" && PERCENTILES.includes(raw.minThroughputPercentile) ? raw.minThroughputPercentile : "p50";
  }
  if (Array.isArray(raw.quantizations)) {
    out.quantizations = cleanProviders(raw.quantizations);
  }
  if (raw.dataCollection === "allow" || raw.dataCollection === "deny") out.dataCollection = raw.dataCollection;
  if (raw.zdr === true) out.zdr = true;
  if (raw.requireParameters === true) out.requireParameters = true;
  if (raw.enforceDistillableText === true) out.enforceDistillableText = true;
  if (typeof raw.localMaxCacheReadPerMillion === "number" && Number.isFinite(raw.localMaxCacheReadPerMillion) && raw.localMaxCacheReadPerMillion >= 0) {
    out.localMaxCacheReadPerMillion = raw.localMaxCacheReadPerMillion;
  }
  return out;
}
function sanitizeProfile(input, now) {
  const raw = asRecord(input);
  if (!raw) return null;
  const id = typeof raw.id === "string" ? raw.id.trim().toLowerCase() : "";
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 80) : "";
  if (!PROFILE_ID.test(id) || !name) return null;
  return {
    id,
    name,
    description: typeof raw.description === "string" ? raw.description.trim().slice(0, 240) : "",
    builtin: raw.builtin === true,
    policy: sanitizePolicy(raw.policy),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : iso(now),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : iso(now)
  };
}
function invalid(message) {
  return {
    ok: false,
    config: null,
    issues: [{ field: "file", severity: "error", message }],
    readOnly: false
  };
}
function parseConfig(text, now = Date.now()) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return invalid("The configuration file is not valid JSON.");
  }
  const record = asRecord(raw);
  if (!record) return invalid("The configuration file must contain a JSON object.");
  const version = typeof record.schemaVersion === "number" ? record.schemaVersion : 0;
  if (version > CONFIG_SCHEMA_VERSION) {
    return {
      ok: false,
      config: null,
      readOnly: true,
      issues: [
        {
          field: "schemaVersion",
          severity: "error",
          message: `This file uses schema ${version}; this extension understands ${CONFIG_SCHEMA_VERSION}. Update the extension instead of overwriting it.`
        }
      ]
    };
  }
  const issues = [];
  let migratedFrom;
  let source = record;
  if (version < CONFIG_SCHEMA_VERSION) {
    migratedFrom = version;
    source = migrateV0(record, now);
    issues.push({
      field: "schemaVersion",
      severity: "warning",
      message: `Migrated the configuration from schema ${version} to ${CONFIG_SCHEMA_VERSION}.`
    });
  }
  const settingsRaw = asRecord(source.settings) ?? {};
  const providerIds = Array.isArray(settingsRaw.providerIds) ? settingsRaw.providerIds.map((value) => typeof value === "string" ? value.trim().toLowerCase() : "").filter((value) => PROVIDER_ID.test(value)) : [];
  const settings = {
    enabled: settingsRaw.enabled !== false,
    defaultProfileId: typeof settingsRaw.defaultProfileId === "string" ? settingsRaw.defaultProfileId : null,
    providerIds: providerIds.length > 0 ? [...new Set(providerIds)] : ["openrouter"]
  };
  const profiles = [];
  const profileIds = /* @__PURE__ */ new Set();
  if (Array.isArray(source.profiles)) {
    for (const entry of source.profiles) {
      const parsed = sanitizeProfile(entry, now);
      if (!parsed) {
        issues.push({ field: "profiles", severity: "warning", message: "Dropped a profile with an invalid id or name." });
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
      field: "settings.defaultProfileId",
      severity: "warning",
      message: "The default profile no longer exists; no default is selected."
    });
    settings.defaultProfileId = null;
  }
  if (!settings.defaultProfileId) settings.defaultProfileId = profiles[0]?.id ?? null;
  const models = {};
  const modelsRaw = asRecord(source.models);
  if (modelsRaw) {
    for (const [key, value] of Object.entries(modelsRaw)) {
      const modelKey = key.trim();
      if (!MODEL_KEY.test(modelKey)) {
        issues.push({ field: "models", severity: "warning", message: `Dropped model entry "${key}".` });
        continue;
      }
      const entry = asRecord(value);
      if (!entry) continue;
      let profileId = typeof entry.profileId === "string" ? entry.profileId : null;
      if (profileId && !profileIds.has(profileId)) {
        issues.push({
          field: `models.${modelKey}.profileId`,
          severity: "warning",
          message: `Model "${modelKey}" pointed at missing profile "${profileId}"; its overrides remain.`
        });
        profileId = null;
      }
      models[modelKey] = {
        profileId,
        overrides: sanitizeOverride(entry.overrides),
        customized: entry.customized !== false,
        updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : iso(now)
      };
    }
  }
  const aliases = {};
  const aliasesRaw = asRecord(source.aliases);
  if (aliasesRaw) {
    for (const [key, value] of Object.entries(aliasesRaw)) {
      if (typeof value !== "string") continue;
      const from = key.trim();
      const to = value.trim();
      if (!from || !to || from === to || !MODEL_KEY.test(from) || !MODEL_KEY.test(to)) continue;
      aliases[from] = to;
    }
  }
  const revision = typeof source.revision === "number" && Number.isFinite(source.revision) && source.revision >= 0 ? Math.floor(source.revision) : 0;
  const config = {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    revision,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : iso(now),
    settings,
    profiles,
    models,
    aliases
  };
  return { ok: true, config, issues, readOnly: false, ...migratedFrom !== void 0 ? { migratedFrom } : {} };
}
function migrateV0(record, _now) {
  return { ...record, schemaVersion: CONFIG_SCHEMA_VERSION };
}
function findProfile(config, id) {
  if (!id) return null;
  return config.profiles.find((profile2) => profile2.id === id) ?? null;
}
function effectivePolicy(config, routingKey) {
  const entry = config.models[routingKey];
  if (!entry) return null;
  const profile2 = findProfile(config, entry.profileId);
  const base = profile2 ? profile2.policy : emptyPolicy();
  return { policy: mergePolicy(base, entry.overrides), profileId: entry.profileId };
}

// src/shared/model-id.ts
var ROUTING_VARIANT_SUFFIXES = [":nitro", ":floor"];
function canonicalModelId(raw) {
  let id = raw.trim();
  for (let i = 0; i < 2; i++) {
    const lower = id.toLowerCase();
    const suffix = ROUTING_VARIANT_SUFFIXES.find((candidate) => lower.endsWith(candidate));
    if (!suffix) break;
    id = id.slice(0, -suffix.length);
  }
  return id;
}
function resolveRoutingKey(rawId, models, aliases) {
  const id = rawId.trim();
  if (!id) return null;
  const candidates = [id];
  const base = canonicalModelId(id);
  if (base !== id) candidates.push(base);
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(models, candidate)) return candidate;
  }
  for (const candidate of candidates) {
    const alias = aliases[candidate];
    if (alias && Object.prototype.hasOwnProperty.call(models, alias)) return alias;
  }
  return null;
}

// src/shared/injection.ts
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function resolveModelPolicy(config, providerID, modelID) {
  if (!config.settings.enabled) return null;
  if (!config.settings.providerIds.includes(providerID)) return null;
  const routingKey = resolveRoutingKey(modelID, config.models, config.aliases);
  if (!routingKey) return null;
  const resolved = effectivePolicy(config, routingKey);
  if (!resolved) return null;
  const { policy } = resolved;
  const provider = policyToProvider(policy);
  return { routingKey, profileId: resolved.profileId, policy, provider };
}
function injectProviderIntoBody(body, provider) {
  if (!isRecord(body)) return null;
  const existing = isRecord(body.provider) ? body.provider : null;
  const merged = existing ? { ...existing } : {};
  for (const [key, value] of Object.entries(provider)) {
    if (value === void 0) continue;
    if (key === "max_price" && isRecord(value) && isRecord(merged.max_price)) {
      merged.max_price = { ...merged.max_price, ...value };
    } else {
      merged[key] = value;
    }
  }
  return { ...body, provider: merged };
}
function bodyModelID(body, fallback) {
  if (isRecord(body) && typeof body.model === "string" && body.model.trim()) return body.model.trim();
  return fallback;
}
function applyInjection(input) {
  const modelID = bodyModelID(input.body, input.modelID);
  const resolved = resolveModelPolicy(input.config, input.providerID, modelID);
  if (!resolved || !resolved.provider) return null;
  const body = injectProviderIntoBody(input.body, resolved.provider);
  if (!body) return null;
  return {
    routingKey: resolved.routingKey,
    profileId: resolved.profileId,
    provider: resolved.provider,
    body
  };
}
function isOpenRouterUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname.toLowerCase() === "openrouter.ai";
  } catch {
    return false;
  }
}
function canCarryRouting(url, body) {
  if (!isOpenRouterUrl(url)) return false;
  if (!isRecord(body)) return false;
  return typeof body.model === "string" && body.model.trim().length > 0;
}

// src/shared/storage.ts
var CONFIG_DIR = "~/.config/openrouter-manager";
var CONFIG_PATH = `${CONFIG_DIR}/routing.json`;
var STATUS_PATH = `${CONFIG_DIR}/runtime-status.json`;
var CACHE_DIR = `${CONFIG_DIR}/cache`;
var MODELS_CACHE_PATH = `${CACHE_DIR}/models.json`;
var HISTORY_PATH = `${CACHE_DIR}/history.json`;
function expandHome(path, home) {
  if (path === "~") return home;
  if (path.startsWith("~/")) return `${home.replace(/\/+$/, "")}${path.slice(1)}`;
  return path;
}

// src/shared/version.ts
var EXTENSION_VERSION = "1.0.0";

// src/plugin/main.ts
var PLUGIN_ID = "openrouter-manager-routing";
var PLUGIN_VERSION = EXTENSION_VERSION;
var STATUS_THROTTLE_MS = 2e3;
var MAX_BODY_BYTES = 16 * 1024 * 1024;
var STAT_THROTTLE_MS = 100;
function nodeFs() {
  try {
    const getBuiltin = process.getBuiltinModule;
    if (typeof getBuiltin !== "function") return null;
    return getBuiltin("node:fs");
  } catch {
    return null;
  }
}
function bun() {
  return typeof globalThis.Bun === "object" ? globalThis.Bun : null;
}
function homeDir() {
  return process.env.HOME || process.env.USERPROFILE || "/";
}
function dirName(path) {
  const index = path.lastIndexOf("/");
  return index <= 0 ? "/" : path.slice(0, index);
}
async function readText(path) {
  const fs = nodeFs();
  if (fs) {
    try {
      return fs.readFileSync(path, "utf8");
    } catch {
      return null;
    }
  }
  const b = bun();
  if (!b) return null;
  try {
    const file = b.file(path);
    if (!await file.exists()) return null;
    return await file.text();
  } catch {
    return null;
  }
}
async function statFile(path) {
  const fs = nodeFs();
  if (fs) {
    try {
      const stat = fs.statSync(path);
      return { mtimeMs: stat.mtimeMs, size: stat.size };
    } catch {
      return null;
    }
  }
  const b = bun();
  if (!b) return null;
  try {
    const file = b.file(path);
    if (!await file.exists()) return null;
    return { mtimeMs: file.lastModified, size: file.size };
  } catch {
    return null;
  }
}
async function writeAtomic(path, text) {
  const temp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  const fs = nodeFs();
  if (fs) {
    fs.mkdirSync(dirName(path), { recursive: true });
    fs.writeFileSync(temp, text, { flag: "wx" });
    fs.renameSync(temp, path);
    return;
  }
  const b = bun();
  if (!b) return;
  await b.write(temp, text);
  await b.write(path, text);
}
function createConfigCache(configPath) {
  let cached = { text: null, config: null, error: null };
  let stamp = null;
  let lastStat = 0;
  return {
    async load(now, force = false) {
      if (!force && now - lastStat < STAT_THROTTLE_MS) return cached;
      lastStat = now;
      const current = await statFile(configPath);
      if (!current) {
        if (cached.text !== null || cached.error === null) {
          cached = { text: null, config: null, error: "Configuration file not found. Open the extension to create it." };
        }
        stamp = null;
        return cached;
      }
      if (stamp && stamp.mtimeMs === current.mtimeMs && stamp.size === current.size) return cached;
      const text = await readText(configPath);
      if (text === null) {
        cached = { ...cached, error: "Configuration file could not be read." };
        return cached;
      }
      const parsed = parseConfig(text, now);
      stamp = current;
      if (!parsed.ok || !parsed.config) {
        const message = parsed.issues[0]?.message ?? "Configuration file is invalid.";
        cached = { text, config: null, error: message };
        return cached;
      }
      cached = { text, config: parsed.config, error: null };
      return cached;
    }
  };
}
var main_default = {
  id: PLUGIN_ID,
  async setup(ctx) {
    const configPath = expandHome(CONFIG_PATH, homeDir());
    const statusPath = expandHome(STATUS_PATH, homeDir());
    const cache = createConfigCache(configPath);
    let appliedCount = 0;
    let lastApplied;
    let lastWrite = 0;
    let pending = null;
    let writeChain = Promise.resolve();
    let lastKnownError = null;
    let latest = { text: null, config: null, error: null };
    const openCodeVersion = typeof ctx?.app?.version === "string" ? ctx.app.version : void 0;
    const writeStatus = () => {
      lastWrite = Date.now();
      const report = {
        pluginVersion: PLUGIN_VERSION,
        writtenAt: new Date(lastWrite).toISOString(),
        appliedCount,
        ...openCodeVersion ? { openCodeVersion } : {},
        ...latest.error ? { configError: latest.error } : {},
        ...latest.config ? { configRevision: latest.config.revision, configUpdatedAt: latest.config.updatedAt } : {},
        ...lastApplied ? { lastApplied } : {}
      };
      const text = `${JSON.stringify(report, null, 2)}
`;
      writeChain = writeChain.then(() => writeAtomic(statusPath, text)).catch(() => {
      });
    };
    const scheduleStatus = (force) => {
      const now = Date.now();
      if (force || now - lastWrite >= STATUS_THROTTLE_MS) {
        writeStatus();
        return;
      }
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        writeStatus();
      }, STATUS_THROTTLE_MS - (now - lastWrite));
      pending.unref?.();
    };
    latest = await cache.load(Date.now(), true);
    scheduleStatus(true);
    await ctx.session.hook("http.request", async (event) => {
      try {
        const request = event?.request;
        if (!request || request.method !== "POST") return;
        const now = Date.now();
        const state = await cache.load(now);
        latest = state;
        if (state.error && state.error !== lastKnownError) {
          lastKnownError = state.error;
          scheduleStatus(true);
        }
        if (!state.config || !state.config.settings.enabled) return;
        const model = event?.model;
        const providerID = model?.providerID ?? "";
        const modelID = model?.id ?? "";
        if (!providerID || !modelID) return;
        const declared = Number(request.headers.get("content-length") ?? "");
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return;
        const text = await request.clone().text();
        if (!text || text.length > MAX_BODY_BYTES) return;
        let body;
        try {
          body = JSON.parse(text);
        } catch {
          return;
        }
        if (!canCarryRouting(request.url, body)) return;
        const injection = applyInjection({ config: state.config, providerID, modelID, body });
        if (!injection) return;
        const headers = new Headers(request.headers);
        headers.delete("content-length");
        const rewritten = new Request(request, {
          headers,
          body: JSON.stringify(injection.body)
        });
        event.request = rewritten;
        appliedCount++;
        lastApplied = {
          at: new Date(now).toISOString(),
          requestKind: typeof event?.kind === "string" ? event.kind : void 0,
          providerID,
          modelID,
          routingKey: injection.routingKey,
          profileId: injection.profileId,
          providerKeys: Object.keys(injection.provider),
          provider: injection.provider
        };
        scheduleStatus(appliedCount === 1);
      } catch {
      }
    });
  }
};
export {
  PLUGIN_ID,
  PLUGIN_VERSION,
  main_default as default
};
