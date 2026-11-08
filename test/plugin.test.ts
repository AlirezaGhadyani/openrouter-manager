import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import plugin from '../src/plugin/main.ts';
import { createDefaultConfig, serializeConfig } from '../src/shared/config.ts';
import { CONFIG_PATH, STATUS_PATH, expandHome } from '../src/shared/storage.ts';

const MODEL = 'deepseek/deepseek-v4.1-flash-1017';
const NOW = Date.parse('2026-11-08T10:00:00.000Z');

function writeConfig(home: string, configure: (config: ReturnType<typeof createDefaultConfig>) => void): void {
  const config = createDefaultConfig(NOW);
  configure(config);
  const path = expandHome(CONFIG_PATH, home);
  mkdirSync(join(home, '.config/openrouter-manager'), { recursive: true });
  writeFileSync(path, serializeConfig(config));
}

function withHome<T>(home: string, run: () => Promise<T>): Promise<T> {
  const previous = process.env.HOME;
  process.env.HOME = home;
  return run().finally(() => {
    process.env.HOME = previous;
  });
}

async function boot(): Promise<(event: Record<string, unknown>) => Promise<void>> {
  let handler: ((event: Record<string, unknown>) => Promise<void>) | null = null;
  const ctx = {
    app: { version: '2.2.6' },
    session: {
      hook: async (name: string, next: (event: Record<string, unknown>) => Promise<void>) => {
        assert.equal(name, 'http.request');
        handler = next;
        return { dispose: async () => {} };
      },
    },
  };
  await plugin.setup(ctx as never);
  assert.ok(handler, 'setup registers the http.request hook');
  return handler;
}

function request(body: unknown, url = 'https://openrouter.ai/api/v1/chat/completions'): { request: Request } {
  return {
    request: new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  };
}

test('the plugin is a default export with an id and setup', () => {
  assert.equal(typeof plugin.id, 'string');
  assert.equal(typeof plugin.setup, 'function');
});

test('a saved policy rewrites the outgoing body without touching anything else', async () => {
  const home = mkdtempSync(join(tmpdir(), 'orm-plugin-'));
  try {
    writeConfig(home, (config) => {
      config.models[MODEL] = {
        profileId: 'cheapest',
        overrides: { maxPromptPerMillion: 0.3 },
        customized: true,
        updatedAt: new Date(NOW).toISOString(),
      };
    });
    await withHome(home, async () => {
      const handler = await boot();
      const event = request({
        model: MODEL,
        stream: true,
        temperature: 0.2,
        messages: [{ role: 'user', content: 'hello' }],
        provider: { allow_fallbacks: false },
      });
      const original = event.request;
      Object.assign(event, { kind: 'primary', model: { providerID: 'openrouter', id: MODEL } });
      await handler(event);
      assert.notEqual(event.request, original);
      const body = (await event.request.json()) as Record<string, unknown>;
      assert.equal(body.model, MODEL);
      assert.equal(body.stream, true);
      assert.equal(body.temperature, 0.2);
      assert.deepEqual(body.messages, [{ role: 'user', content: 'hello' }]);
      assert.deepEqual(body.provider, { allow_fallbacks: false, sort: 'price', max_price: { prompt: 0.3 } });
      assert.equal(new Headers(event.request.headers).get('content-length'), null);
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('the hook leaves untouched requests untouched', async () => {
  const home = mkdtempSync(join(tmpdir(), 'orm-plugin-'));
  try {
    writeConfig(home, (config) => {
      config.models[MODEL] = {
        profileId: 'cheapest',
        overrides: {},
        customized: false,
        updatedAt: new Date(NOW).toISOString(),
      };
    });
    await withHome(home, async () => {
      const handler = await boot();

      const unknown = request({ model: 'other/model' });
      const unknownRequest = unknown.request;
      Object.assign(unknown, { model: { providerID: 'openrouter', id: 'other/model' } });
      await handler(unknown);
      assert.equal(unknown.request, unknownRequest);

      const otherProvider = request({ model: MODEL });
      const otherRequest = otherProvider.request;
      Object.assign(otherProvider, { model: { providerID: 'anthropic', id: MODEL } });
      await handler(otherProvider);
      assert.equal(otherProvider.request, otherRequest);

      const otherUrl = request({ model: MODEL }, 'https://example.com/api/v1/chat/completions');
      const otherUrlRequest = otherUrl.request;
      Object.assign(otherUrl, { model: { providerID: 'openrouter', id: MODEL } });
      await handler(otherUrl);
      assert.equal(otherUrl.request, otherUrlRequest);

      const notJson = { request: new Request('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', body: 'not json' }) };
      const notJsonRequest = notJson.request;
      Object.assign(notJson, { model: { providerID: 'openrouter', id: MODEL } });
      await handler(notJson);
      assert.equal(notJson.request, notJsonRequest);
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('disabling the master switch stops injection and keeps the policy', async () => {
  const home = mkdtempSync(join(tmpdir(), 'orm-plugin-'));
  try {
    writeConfig(home, (config) => {
      config.settings.enabled = false;
      config.models[MODEL] = {
        profileId: 'cheapest',
        overrides: {},
        customized: false,
        updatedAt: new Date(NOW).toISOString(),
      };
    });
    await withHome(home, async () => {
      const handler = await boot();
      const event = request({ model: MODEL });
      const original = event.request;
      Object.assign(event, { model: { providerID: 'openrouter', id: MODEL } });
      await handler(event);
      assert.equal(event.request, original);
      const saved = JSON.parse(readFileSync(expandHome(CONFIG_PATH, home), 'utf8')) as {
        models: Record<string, unknown>;
      };
      assert.ok(saved.models[MODEL], 'the policy is preserved');
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('a routing variant still resolves the base policy', async () => {
  const home = mkdtempSync(join(tmpdir(), 'orm-plugin-'));
  try {
    writeConfig(home, (config) => {
      config.models[MODEL] = {
        profileId: 'low-latency',
        overrides: {},
        customized: false,
        updatedAt: new Date(NOW).toISOString(),
      };
    });
    await withHome(home, async () => {
      const handler = await boot();
      const event = request({ model: `${MODEL}:nitro` });
      Object.assign(event, { model: { providerID: 'openrouter', id: `${MODEL}:nitro` } });
      await handler(event);
      const body = (await event.request.json()) as { model: string; provider: unknown };
      assert.equal(body.model, `${MODEL}:nitro`);
      assert.deepEqual(body.provider, { sort: 'latency' });
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('the plugin reports its loaded revision and applied request', async () => {
  const home = mkdtempSync(join(tmpdir(), 'orm-plugin-'));
  try {
    writeConfig(home, (config) => {
      config.models[MODEL] = {
        profileId: 'fastest',
        overrides: {},
        customized: false,
        updatedAt: new Date(NOW).toISOString(),
      };
    });
    await withHome(home, async () => {
      const handler = await boot();
      const event = request({ model: MODEL });
      Object.assign(event, { kind: 'primary', model: { providerID: 'openrouter', id: MODEL } });
      await handler(event);
      // The status write is throttled; allow the scheduled write to land.
      await new Promise((resolve) => setTimeout(resolve, 2200));
      const status = JSON.parse(readFileSync(expandHome(STATUS_PATH, home), 'utf8')) as {
        pluginVersion: string;
        configRevision: number;
        appliedCount: number;
        openCodeVersion: string;
        lastApplied: { routingKey: string; providerKeys: string[] };
      };
      assert.equal(status.pluginVersion, '1.0.0');
      assert.equal(status.openCodeVersion, '2.2.6');
      assert.equal(status.configRevision, 0);
      assert.equal(status.appliedCount, 1);
      assert.equal(status.lastApplied.routingKey, MODEL);
      assert.deepEqual(status.lastApplied.providerKeys, ['sort']);
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});

test('a missing or invalid config never breaks a request', async () => {
  const home = mkdtempSync(join(tmpdir(), 'orm-plugin-'));
  try {
    await withHome(home, async () => {
      const handler = await boot();
      const event = request({ model: MODEL });
      const original = event.request;
      Object.assign(event, { model: { providerID: 'openrouter', id: MODEL } });
      await handler(event);
      assert.equal(event.request, original);

      mkdirSync(join(home, '.config/openrouter-manager'), { recursive: true });
      writeFileSync(expandHome(CONFIG_PATH, home), '{not json');
      await new Promise((resolve) => setTimeout(resolve, 600));
      const second = request({ model: MODEL });
      const secondOriginal = second.request;
      Object.assign(second, { model: { providerID: 'openrouter', id: MODEL } });
      await handler(second);
      assert.equal(second.request, secondOriginal);
    });
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
