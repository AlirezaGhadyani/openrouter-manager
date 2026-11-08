import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultConfig } from '../src/shared/config.ts';
import { applyInjection, canCarryRouting, injectProviderIntoBody, isOpenRouterUrl } from '../src/shared/injection.ts';

const NOW = Date.parse('2026-11-08T10:00:00.000Z');
const MODEL = 'deepseek/deepseek-v4.1-flash-1017';

function configWith(overrides: Record<string, unknown>, profileId: string | null = 'cheapest') {
  const config = createDefaultConfig(NOW);
  config.models[MODEL] = {
    profileId,
    overrides: overrides as never,
    customized: true,
    updatedAt: new Date(NOW).toISOString(),
  };
  return config;
}

test('only openrouter hosts and JSON bodies with a model are candidates', () => {
  assert.equal(isOpenRouterUrl('https://openrouter.ai/api/v1/chat/completions'), true);
  assert.equal(isOpenRouterUrl('https://eu.openrouter.ai/api/v1/responses'), false);
  assert.equal(isOpenRouterUrl('http://openrouter.ai/api/v1/responses'), false);
  assert.equal(isOpenRouterUrl('https://example.com/api/v1/chat/completions'), false);
  assert.equal(canCarryRouting('https://openrouter.ai/api/v1/chat/completions', { model: 'a/b' }), true);
  assert.equal(canCarryRouting('https://openrouter.ai/api/v1/chat/completions', { messages: [] }), false);
});

test('a model policy becomes a provider object and preserves request fields', () => {
  const body = {
    model: MODEL,
    stream: true,
    temperature: 0.2,
    messages: [{ role: 'user', content: 'hi' }],
    tools: [{ type: 'function', function: { name: 'x' } }],
  };
  const result = applyInjection({
    config: configWith({ maxPromptPerMillion: 0.5, sort: 'throughput' }),
    providerID: 'openrouter',
    modelID: MODEL,
    body,
  });
  assert.ok(result);
  assert.equal(result.routingKey, MODEL);
  assert.equal(result.profileId, 'cheapest');
  assert.equal(result.body.model, MODEL);
  assert.equal(result.body.stream, true);
  assert.equal(result.body.temperature, 0.2);
  assert.deepEqual(result.body.tools, body.tools);
  assert.deepEqual(result.body.provider, { sort: 'throughput', max_price: { prompt: 0.5 } });
  // The input object is not mutated.
  assert.equal('provider' in body, false);
});

test('existing provider fields are preserved and max_price merges', () => {
  const body = {
    model: MODEL,
    provider: { allow_fallbacks: false, order: ['deepinfra'], max_price: { completion: 2 } },
  };
  const merged = injectProviderIntoBody(body, { sort: 'price', max_price: { prompt: 1 } });
  assert.deepEqual(merged?.provider, {
    allow_fallbacks: false,
    order: ['deepinfra'],
    sort: 'price',
    max_price: { completion: 2, prompt: 1 },
  });
});

test('a routing variant suffix resolves to the base model policy', () => {
  const result = applyInjection({
    config: configWith({ sort: 'latency' }),
    providerID: 'openrouter',
    modelID: MODEL,
    body: { model: `${MODEL}:nitro`, messages: [] },
  });
  assert.ok(result);
  assert.equal(result.routingKey, MODEL);
  assert.equal(result.body.model, `${MODEL}:nitro`);
  assert.deepEqual(result.body.provider, { sort: 'latency' });
});

test('canonical slug aliases match only when learned', () => {
  const config = configWith({ sort: 'price' });
  config.aliases['deepseek/deepseek-v4.1-flash-20261017'] = MODEL;
  const aliased = applyInjection({
    config,
    providerID: 'openrouter',
    modelID: 'deepseek/deepseek-v4.1-flash-20261017',
    body: { model: 'deepseek/deepseek-v4.1-flash-20261017' },
  });
  assert.equal(aliased?.routingKey, MODEL);
});

test('requests without a policy, disabled settings, or another provider are untouched', () => {
  const body = { model: 'unknown/model', messages: [] };
  assert.equal(applyInjection({ config: configWith({ sort: 'price' }), providerID: 'openrouter', modelID: 'unknown/model', body }), null);

  const disabled = configWith({ sort: 'price' });
  disabled.settings.enabled = false;
  assert.equal(applyInjection({ config: disabled, providerID: 'openrouter', modelID: MODEL, body: { model: MODEL } }), null);

  assert.equal(applyInjection({ config: configWith({ sort: 'price' }), providerID: 'anthropic', modelID: MODEL, body: { model: MODEL } }), null);
});

test('a policy with only a local cache preference injects nothing', () => {
  const result = applyInjection({
    config: configWith({ localMaxCacheReadPerMillion: 0.01 }, null),
    providerID: 'openrouter',
    modelID: MODEL,
    body: { model: MODEL },
  });
  assert.equal(result, null);
});

test('provider selection fields map to only, ignore, and order', () => {
  const config = configWith({ mode: 'only', providers: ['deepinfra'], order: ['deepinfra/fp8'], allowFallbacks: false }, null);
  const result = applyInjection({ config, providerID: 'openrouter', modelID: MODEL, body: { model: MODEL } });
  assert.deepEqual(result?.provider, {
    only: ['deepinfra'],
    order: ['deepinfra/fp8'],
    allow_fallbacks: false,
  });
});
