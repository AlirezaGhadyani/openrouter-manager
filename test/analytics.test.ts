import assert from 'node:assert/strict';
import test from 'node:test';
import type { EndpointInfo, ModelSummary } from '../src/shared/api-types.ts';
import { buildAnalytics, buildHistoryPoint } from '../src/shared/analytics.ts';

function model(id: string, input: number | null): ModelSummary {
  return {
    id,
    canonicalSlug: id,
    name: id,
    author: id.split('/')[0] ?? '',
    created: null,
    contextLength: 1000,
    maxCompletionTokens: null,
    inputModalities: ['text'],
    outputModalities: ['text'],
    inputPerMillion: input,
    outputPerMillion: input === null ? null : input * 2,
    cacheReadPerMillion: null,
    cacheWritePerMillion: null,
    detailsPath: null,
  };
}

function endpoint(tag: string, input: number, output: number, latency: number, throughput: number, cache: number | null = null): EndpointInfo {
  return {
    tag,
    providerName: tag.split('/')[0] ?? tag,
    endpointName: tag,
    modelId: 'x',
    inputPerMillion: input,
    outputPerMillion: output,
    cacheReadPerMillion: cache,
    cacheWritePerMillion: null,
    imagePrice: null,
    requestPrice: null,
    latencyMs: { p50: latency },
    throughputTps: { p50: throughput },
    contextLength: null,
    maxPromptTokens: null,
    maxCompletionTokens: null,
    quantization: null,
    serviceTier: null,
    status: 0,
    available: true,
    uptime30m: 99,
    uptime1d: 99,
    supportsImplicitCaching: false,
    supportedParameters: [],
    priceOverrides: [],
    lastUpdated: '2026-11-08T10:00:00.000Z',
  };
}

test('provider rollups count models, wins, medians, and leaders', () => {
  const models = [model('a/one', 1), model('a/two', 2)];
  const endpoints = {
    'a/one': [endpoint('cheap/fp8', 1, 2, 500, 20), endpoint('fast/fp8', 2, 4, 200, 90, 0.1)],
    'a/two': [endpoint('cheap', 1.5, 3, 400, 40), endpoint('fast/fp8', 2.5, 5, 300, 70)],
  };
  const analytics = buildAnalytics(models, endpoints);
  assert.equal(analytics.providerCount, 2);
  assert.equal(analytics.endpointCount, 4);
  assert.equal(analytics.modelsWithEndpoints, 2);
  assert.deepEqual(analytics.leaders['a/one'], {
    cheapestInput: 'cheap/fp8',
    cheapestOutput: 'cheap/fp8',
    bestCacheRead: 'fast/fp8',
    fastestThroughput: 'fast/fp8',
    lowestLatency: 'fast/fp8',
  });

  const cheap = analytics.providers.find((provider) => provider.slug === 'cheap');
  assert.ok(cheap);
  assert.equal(cheap.models, 2);
  assert.equal(cheap.endpoints, 2);
  assert.equal(cheap.cheapestInputWins, 2);
  assert.equal(cheap.cheapestOutputWins, 2);
  assert.equal(cheap.fastestWins, 0);
  assert.equal(cheap.medianInputPerMillion, 1.25);

  const fast = analytics.providers.find((provider) => provider.slug === 'fast');
  assert.equal(fast?.fastestWins, 2);
  assert.equal(fast?.lowestLatencyWins, 2);
  assert.equal(fast?.bestCacheReadPerMillion, 0.1);
  assert.equal(fast?.bestCacheWins, 1);
});

test('models without endpoint data are not counted as covered', () => {
  const analytics = buildAnalytics([model('a/one', 1), model('a/two', 2)], { 'a/one': [endpoint('x', 1, 2, 3, 4)] });
  assert.equal(analytics.modelsWithEndpoints, 1);
  assert.equal(analytics.modelCount, 2);
  assert.equal(analytics.providerCount, 1);
});

test('history points use catalog medians and omit a provider count when unknown', () => {
  const point = buildHistoryPoint([model('a/one', 1), model('a/two', 3)], {}, 0);
  assert.equal(point.medianInputPerMillion, 2);
  assert.equal(point.medianOutputPerMillion, 4);
  assert.equal(point.models, 2);
  assert.equal('providers' in point, false);
});
