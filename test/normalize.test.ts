import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bestPercentile,
  bestPrice,
  endpointsPath,
  normalizeEndpoint,
  normalizeModel,
  normalizeModels,
  perMillion,
  usd,
} from '../src/shared/normalize.ts';

const MODEL = {
  id: 'deepseek/deepseek-v4.1-flash-1017',
  canonical_slug: 'deepseek/deepseek-v4.1-flash-20261017',
  name: 'DeepSeek: DeepSeek V4.1 Flash 1017',
  created: 1792225624,
  context_length: 1048576,
  architecture: { input_modalities: ['text', 'image'], output_modalities: ['text'] },
  pricing: {
    prompt: '0.000000006',
    completion: '0.0000005',
    input_cache_read: '0.000000005',
  },
  top_provider: { context_length: 1048576, max_completion_tokens: 943718 },
  links: { details: '/api/v1/models/deepseek/deepseek-v4.1-flash-20261017/endpoints' },
};

test('models keep canonical ids, modalities, and per-million prices', () => {
  const model = normalizeModel(MODEL);
  assert.ok(model);
  assert.equal(model.id, 'deepseek/deepseek-v4.1-flash-1017');
  assert.equal(model.canonicalSlug, 'deepseek/deepseek-v4.1-flash-20261017');
  assert.equal(model.author, 'deepseek');
  assert.equal(model.contextLength, 1048576);
  assert.equal(model.inputPerMillion, 0.006);
  assert.equal(model.outputPerMillion, 0.5);
  assert.equal(model.cacheReadPerMillion, 0.005);
  assert.deepEqual(model.inputModalities, ['text', 'image']);
  assert.equal(model.detailsPath, MODEL.links.details);
});

test('per-token and per-unit prices stay distinct', () => {
  assert.equal(perMillion('0.0000005'), 0.5);
  assert.equal(perMillion('not-a-number'), null);
  assert.equal(perMillion('-1'), null);
  assert.equal(usd('0.04'), 0.04);
});

test('missing pricing is null, never zero', () => {
  const model = normalizeModel({ id: 'x/y', name: 'X' });
  assert.equal(model?.inputPerMillion, null);
  assert.equal(model?.outputPerMillion, null);
  assert.equal(model?.cacheReadPerMillion, null);
  assert.equal(model?.contextLength, null);
});

test('models without ids are dropped and duplicates removed', () => {
  const models = normalizeModels({ data: [MODEL, MODEL, { name: 'No id' }] });
  assert.equal(models.length, 1);
});

test('endpoint percentiles are read as ms and tokens/sec, with independent cache fields', () => {
  const endpoint = normalizeEndpoint(
    {
      name: 'DeepInfra | deepseek',
      model_id: MODEL.id,
      provider_name: 'DeepInfra',
      tag: 'deepinfra/fp8',
      context_length: 1048576,
      max_completion_tokens: 65536,
      quantization: 'fp8',
      status: 0,
      uptime_last_30m: 99.94,
      uptime_last_1d: 99.1,
      supports_implicit_caching: true,
      pricing: {
        prompt: '0.00000015',
        completion: '0.0000006',
        input_cache_read: '0.000000015',
        input_cache_write: '0.00000002',
        image: '0.02',
        request: '0.001',
        overrides: [
          { utc_start: 0, utc_end: 1400, prompt: '0.00000015', completion: '0.0000006' },
        ],
      },
      latency_last_30m: { p50: 240.5, p90: 610.2, p99: 900 },
      throughput_last_30m: { p50: 82.4, p90: 41.2 },
      supported_parameters: ['tools', 'reasoning'],
    },
    MODEL.id,
    '2026-11-08T10:00:00.000Z',
  );
  assert.ok(endpoint);
  assert.equal(endpoint.inputPerMillion, 0.15);
  assert.equal(endpoint.outputPerMillion, 0.6);
  assert.equal(endpoint.cacheReadPerMillion, 0.015);
  assert.equal(endpoint.cacheWritePerMillion, 0.02);
  assert.equal(endpoint.imagePrice, 0.02);
  assert.equal(endpoint.requestPrice, 0.001);
  assert.deepEqual(endpoint.latencyMs, { p50: 240.5, p90: 610.2, p99: 900 });
  assert.deepEqual(endpoint.throughputTps, { p50: 82.4, p90: 41.2 });
  assert.equal(endpoint.available, true);
  assert.equal(endpoint.uptime30m, 99.94);
  assert.equal(endpoint.priceOverrides.length, 1);
  assert.equal(endpoint.priceOverrides[0]?.promptPerMillion, 0.15);
});

test('null performance and non-zero status are handled honestly', () => {
  const endpoint = normalizeEndpoint(
    { tag: 'slow/provider', status: 3, latency_last_30m: null, throughput_last_30m: null, pricing: { prompt: '0.000001' } },
    'x/y',
    '2026-11-08T10:00:00.000Z',
  );
  assert.equal(endpoint?.latencyMs, null);
  assert.equal(endpoint?.throughputTps, null);
  assert.equal(endpoint?.available, false);
  assert.equal(endpoint?.status, 3);
  assert.equal(endpoint?.inputPerMillion, 1);
});

test('endpoint paths prefer the API link', () => {
  assert.equal(
    endpointsPath({ id: MODEL.id, canonicalSlug: MODEL.canonical_slug, detailsPath: MODEL.links.details }),
    MODEL.links.details,
  );
  assert.equal(
    endpointsPath({ id: 'a/b', canonicalSlug: 'a/b-2026', detailsPath: null }),
    '/api/v1/models/a/b-2026/endpoints',
  );
  assert.equal(
    endpointsPath({ id: 'a/b', canonicalSlug: 'a/b', detailsPath: '/api/v1/models/../../admin/endpoints' }),
    '/api/v1/models/a/b/endpoints',
  );
});

test('best price and percentile handle missing values', () => {
  const endpoints = [
    { inputPerMillion: 1, outputPerMillion: null, latencyMs: { p50: 300 }, throughputTps: { p50: 40 } },
    { inputPerMillion: 0.5, outputPerMillion: 2, latencyMs: null, throughputTps: { p50: 90 } },
  ] as never;
  assert.equal(bestPrice(endpoints, 'inputPerMillion'), 0.5);
  assert.equal(bestPrice(endpoints, 'outputPerMillion'), 2);
  assert.equal(bestPercentile(endpoints, 'latencyMs', 'p50'), 300);
  assert.equal(bestPercentile(endpoints, 'throughputTps', 'p50'), 90);
});
