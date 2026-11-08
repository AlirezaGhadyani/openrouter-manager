/**
 * OpenCode plugin bundled with the OpenRouter Manager extension.
 *
 * OpenChamber loads this folder into the managed OpenCode config. It has no
 * imports: Node built-ins are reached through `process.getBuiltinModule`, with
 * Bun's file API as a fallback. It reads the same `routing.json` the panel
 * writes, so the UI and the runtime cannot drift apart.
 */
import { parseConfig } from '../shared/config.ts';
import { applyInjection, canCarryRouting } from '../shared/injection.ts';
import { CONFIG_PATH, STATUS_PATH, expandHome, type StatusReport } from '../shared/storage.ts';
import type { ManagerConfig } from '../shared/types.ts';
import { EXTENSION_VERSION } from '../shared/version.ts';

export const PLUGIN_ID = 'openrouter-manager-routing';
export const PLUGIN_VERSION = EXTENSION_VERSION;

const STATUS_THROTTLE_MS = 2_000;
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const STAT_THROTTLE_MS = 100;

type AnyRecord = Record<string, any>;

interface FsLike {
  statSync(path: string): { mtimeMs: number; size: number };
  readFileSync(path: string, encoding: 'utf8'): string;
  writeFileSync(path: string, data: string, options?: { flag?: string }): void;
  renameSync(from: string, to: string): void;
  mkdirSync(path: string, options: { recursive: true }): void;
}

interface BunLike {
  file(path: string): {
    text(): Promise<string>;
    exists(): Promise<boolean>;
    lastModified: number;
    size: number;
  };
  write(path: string, data: string): Promise<number>;
}

function nodeFs(): FsLike | null {
  try {
    const getBuiltin = (process as AnyRecord).getBuiltinModule;
    if (typeof getBuiltin !== 'function') return null;
    return getBuiltin('node:fs') as FsLike;
  } catch {
    return null;
  }
}

function bun(): BunLike | null {
  return typeof (globalThis as AnyRecord).Bun === 'object' ? ((globalThis as AnyRecord).Bun as BunLike) : null;
}

function homeDir(): string {
  return process.env.HOME || process.env.USERPROFILE || '/';
}

function dirName(path: string): string {
  const index = path.lastIndexOf('/');
  return index <= 0 ? '/' : path.slice(0, index);
}

async function readText(path: string): Promise<string | null> {
  const fs = nodeFs();
  if (fs) {
    try {
      return fs.readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  }
  const b = bun();
  if (!b) return null;
  try {
    const file = b.file(path);
    if (!(await file.exists())) return null;
    return await file.text();
  } catch {
    return null;
  }
}

async function statFile(path: string): Promise<{ mtimeMs: number; size: number } | null> {
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
    if (!(await file.exists())) return null;
    return { mtimeMs: file.lastModified, size: file.size };
  } catch {
    return null;
  }
}

async function writeAtomic(path: string, text: string): Promise<void> {
  const temp = `${path}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  const fs = nodeFs();
  if (fs) {
    fs.mkdirSync(dirName(path), { recursive: true });
    // `wx` refuses to follow an existing path, including a planted symlink.
    fs.writeFileSync(temp, text, { flag: 'wx' });
    fs.renameSync(temp, path);
    return;
  }
  const b = bun();
  if (!b) return;
  await b.write(temp, text);
  // Bun has no global rename; a direct write is the fallback. The status file is
  // diagnostic, never the source of truth, so a torn write cannot affect routing.
  await b.write(path, text);
}

interface ConfigState {
  text: string | null;
  config: ManagerConfig | null;
  error: string | null;
}

function createConfigCache(configPath: string) {
  let cached: ConfigState = { text: null, config: null, error: null };
  let stamp: { mtimeMs: number; size: number } | null = null;
  let lastStat = 0;

  return {
    async load(now: number, force = false): Promise<ConfigState> {
      if (!force && now - lastStat < STAT_THROTTLE_MS) return cached;
      lastStat = now;
      const current = await statFile(configPath);
      if (!current) {
        if (cached.text !== null || cached.error === null) {
          cached = { text: null, config: null, error: 'Configuration file not found. Open the extension to create it.' };
        }
        stamp = null;
        return cached;
      }
      if (stamp && stamp.mtimeMs === current.mtimeMs && stamp.size === current.size) return cached;
      const text = await readText(configPath);
      if (text === null) {
        cached = { ...cached, error: 'Configuration file could not be read.' };
        return cached;
      }
      const parsed = parseConfig(text, now);
      stamp = current;
      if (!parsed.ok || !parsed.config) {
        const message = parsed.issues[0]?.message ?? 'Configuration file is invalid.';
        cached = { text, config: null, error: message };
        return cached;
      }
      cached = { text, config: parsed.config, error: null };
      return cached;
    },
  };
}

export default {
  id: PLUGIN_ID,
  async setup(ctx: AnyRecord) {
    const configPath = expandHome(CONFIG_PATH, homeDir());
    const statusPath = expandHome(STATUS_PATH, homeDir());
    const cache = createConfigCache(configPath);

    let appliedCount = 0;
    let lastApplied: StatusReport['lastApplied'];
    let lastWrite = 0;
    let pending: ReturnType<typeof setTimeout> | null = null;
    let writeChain = Promise.resolve();
    let lastKnownError: string | null = null;
    let latest: ConfigState = { text: null, config: null, error: null };

    const openCodeVersion =
      typeof ctx?.app?.version === 'string' ? ctx.app.version : undefined;

    const writeStatus = (): void => {
      lastWrite = Date.now();
      const report: StatusReport = {
        pluginVersion: PLUGIN_VERSION,
        writtenAt: new Date(lastWrite).toISOString(),
        appliedCount,
        ...(openCodeVersion ? { openCodeVersion } : {}),
        ...(latest.error ? { configError: latest.error } : {}),
        ...(latest.config ? { configRevision: latest.config.revision, configUpdatedAt: latest.config.updatedAt } : {}),
        ...(lastApplied ? { lastApplied } : {}),
      };
      const text = `${JSON.stringify(report, null, 2)}\n`;
      writeChain = writeChain
        .then(() => writeAtomic(statusPath, text))
        .catch(() => {
          // Diagnostics are best-effort; routing never depends on this file.
        });
    };

    const scheduleStatus = (force: boolean): void => {
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

    await ctx.session.hook('http.request', async (event: AnyRecord) => {
      try {
        const request = event?.request as Request | undefined;
        if (!request || request.method !== 'POST') return;

        const now = Date.now();
        const state = await cache.load(now);
        latest = state;
        if (state.error && state.error !== lastKnownError) {
          lastKnownError = state.error;
          scheduleStatus(true);
        }
        if (!state.config || !state.config.settings.enabled) return;

        const model = event?.model as { providerID?: string; id?: string } | undefined;
        const providerID = model?.providerID ?? '';
        const modelID = model?.id ?? '';
        if (!providerID || !modelID) return;

        const declared = Number(request.headers.get('content-length') ?? '');
        if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return;
        const text = await request.clone().text();
        if (!text || text.length > MAX_BODY_BYTES) return;
        let body: unknown;
        try {
          body = JSON.parse(text);
        } catch {
          return;
        }
        if (!canCarryRouting(request.url, body)) return;

        const injection = applyInjection({ config: state.config, providerID, modelID, body });
        if (!injection) return;

        const headers = new Headers(request.headers);
        headers.delete('content-length');
        // Constructing from the original Request keeps method, signal, redirect,
        // credentials, and the rest of its init; only headers and body change.
        const rewritten = new Request(request, {
          headers,
          body: JSON.stringify(injection.body),
        });
        event.request = rewritten;

        appliedCount++;
        lastApplied = {
          at: new Date(now).toISOString(),
          requestKind: typeof event?.kind === 'string' ? event.kind : undefined,
          providerID,
          modelID,
          routingKey: injection.routingKey,
          profileId: injection.profileId,
          providerKeys: Object.keys(injection.provider),
          provider: injection.provider,
        };
        scheduleStatus(appliedCount === 1);
      } catch {
        // A routing rewrite must never break a model call. Leave the request as it was.
      }
    });
  },
};
