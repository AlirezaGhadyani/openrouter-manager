import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG_PATH, MODELS_CACHE_PATH, STATUS_PATH } from '../src/shared/storage.ts';
import { ConfigConflictError, MODEL_TTL_MS, Repository } from '../src/data/repository.ts';
import type { PanelHost } from '../src/data/host.ts';

class FakeHost implements PanelHost {
  files = new Map<string, string>();
  requests: Array<{ method: string; path: string; status: number; body: string }> = [];
  nextResponses: Array<{ status: number; body: string }> = [];

  async request(input: { method: string; path: string; query?: Record<string, string>; body?: string }) {
    const next = this.nextResponses.shift() ?? { status: 500, body: '{}' };
    this.requests.push({ method: input.method, path: input.path, status: next.status, body: next.body });
    return next;
  }

  async readFile(path: string) {
    const value = this.files.get(path);
    if (value === undefined) throw Object.assign(new Error('missing'), { code: 'NOT_FOUND' });
    return { content: value };
  }

  async writeFile(path: string, content: string) {
    this.files.set(path, content);
    return { written: true as const };
  }

  async stat(path: string) {
    const value = this.files.get(path);
    if (value === undefined) return { kind: 'missing', size: 0, mtime: 0 };
    return { kind: 'file', size: value.length, mtime: Date.now() };
  }
}

const MODEL_A = {
  id: 'deepseek/model-a',
  canonical_slug: 'deepseek/model-a-2026',
  name: 'Model A',
  context_length: 1000,
  architecture: { input_modalities: ['text'], output_modalities: ['text'] },
  pricing: { prompt: '0.000001', completion: '0.000002' },
  links: { details: '/api/v1/models/deepseek/model-a-2026/endpoints' },
};
const MODEL_B = {
  id: 'deepseek/model-b',
  name: 'Model B',
  context_length: 2000,
  architecture: { input_modalities: ['text'], output_modalities: ['text'] },
  pricing: { prompt: '0.000003', completion: '0.000004' },
};

const ENDPOINTS = {
  data: {
    id: 'deepseek/model-a',
    endpoints: [
      {
        tag: 'deepinfra/fp8',
        provider_name: 'DeepInfra',
        status: 0,
        pricing: { prompt: '0.000001', completion: '0.000002' },
        latency_last_30m: { p50: 200 },
        throughput_last_30m: { p50: 50 },
      },
    ],
  },
};

test('config is created on first open and saved atomically by fingerprint', async () => {
  const host = new FakeHost();
  let now = Date.parse('2026-11-08T10:00:00.000Z');
  const repo = new Repository(host, () => now);
  const first = await repo.loadConfig();
  assert.equal(host.files.has(CONFIG_PATH), true);
  assert.equal(first.config.revision, 0);

  now += 1000;
  const saved = await repo.saveConfig(
    { ...first.config, settings: { ...first.config.settings, enabled: false } },
    first.fingerprint,
  );
  assert.equal(saved.config.revision, 1);
  assert.equal(saved.config.settings.enabled, false);
  assert.equal(JSON.parse(host.files.get(CONFIG_PATH)!).settings.enabled, false);
});

test('a save refuses to overwrite a change made outside the panel', async () => {
  const host = new FakeHost();
  const repo = new Repository(host);
  const first = await repo.loadConfig();
  host.files.set(CONFIG_PATH, `${host.files.get(CONFIG_PATH)} `);
  await assert.rejects(
    () => repo.saveConfig(first.config, first.fingerprint),
    (error: unknown) => error instanceof ConfigConflictError,
  );
});

test('catalog is cached, force refreshes it, and a failed refresh keeps the stale copy', async () => {
  const host = new FakeHost();
  let now = Date.parse('2026-11-08T10:00:00.000Z');
  const repo = new Repository(host, () => now);
  host.nextResponses.push({ status: 200, body: JSON.stringify({ data: [MODEL_A, MODEL_B] }) });

  const first = await repo.loadCatalog();
  assert.equal(first.models.length, 2);
  assert.equal(first.fromCache, false);
  assert.equal(host.files.has(MODELS_CACHE_PATH), true);

  const cached = await repo.loadCatalog();
  assert.equal(cached.fromCache, true);
  assert.equal(host.requests.length, 1);

  now += MODEL_TTL_MS + 1;
  host.nextResponses.push({ status: 500, body: '{"error":{"message":"down"}}' });
  const stale = await repo.loadCatalog();
  assert.equal(stale.fromCache, true);
  assert.equal(stale.stale, true);
  assert.equal(stale.models.length, 2);
  assert.match(String(stale.error), /500/);

  host.nextResponses.push({ status: 200, body: JSON.stringify({ data: [MODEL_A] }) });
  const forced = await repo.loadCatalog(true);
  assert.equal(forced.fromCache, false);
  assert.equal(forced.models.length, 1);
});

test('endpoint data is cached per model and stale on failure', async () => {
  const host = new FakeHost();
  let now = Date.parse('2026-11-08T10:00:00.000Z');
  const repo = new Repository(host, () => now);
  const model = {
    id: 'deepseek/model-a',
    canonicalSlug: 'deepseek/model-a-2026',
    detailsPath: '/api/v1/models/deepseek/model-a-2026/endpoints',
  } as never;

  host.nextResponses.push({ status: 200, body: JSON.stringify(ENDPOINTS) });
  const first = await repo.loadEndpoints(model);
  assert.equal(first.endpoints.length, 1);
  assert.equal(first.endpoints[0]?.inputPerMillion, 1);

  const cached = await repo.loadEndpoints(model);
  assert.equal(cached.fromCache, true);
  assert.equal(host.requests.length, 1);

  now += 11 * 60 * 1000;
  host.nextResponses.push({ status: 429, body: '{}' });
  const stale = await repo.loadEndpoints(model);
  assert.equal(stale.stale, true);
  assert.equal(stale.endpoints.length, 1);
});

test('a missing config leaves the runtime without a policy, not a crash', async () => {
  const host = new FakeHost();
  const repo = new Repository(host);
  assert.equal(await repo.readStatus(), null);
  host.files.set(STATUS_PATH, JSON.stringify({ pluginVersion: '1.0.0', writtenAt: '2026-11-08T10:00:00.000Z', appliedCount: 0 }));
  assert.equal((await repo.readStatus())?.pluginVersion, '1.0.0');
});

test('history appends at most hourly and is capped', async () => {
  const host = new FakeHost();
  let now = Date.parse('2026-11-08T10:00:00.000Z');
  const repo = new Repository(host, () => now);
  host.nextResponses.push({ status: 200, body: JSON.stringify({ data: [MODEL_A] }) });
  await repo.loadCatalog();
  now += 30 * 60 * 1000;
  host.nextResponses.push({ status: 200, body: JSON.stringify({ data: [MODEL_A] }) });
  await repo.loadCatalog(true);
  const history = await repo.readHistory();
  assert.equal(history?.points.length, 1);
  now += 60 * 60 * 1000;
  host.nextResponses.push({ status: 200, body: JSON.stringify({ data: [MODEL_A] }) });
  await repo.loadCatalog(true);
  assert.equal((await repo.readHistory())?.points.length, 2);
});
