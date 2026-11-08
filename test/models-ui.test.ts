import assert from 'node:assert/strict';
import test from 'node:test';
import type { EndpointInfo, ModelSummary } from '../src/shared/api-types.ts';
import type { BrowserState } from '../src/panel/state.ts';
import { filterAndSortModels } from '../src/panel/views/models.ts';

function model(id: string, name: string, input: number | null, output: number | null, context: number | null): ModelSummary {
  return {
    id,
    canonicalSlug: id,
    name,
    author: id.split('/')[0] ?? '',
    created: null,
    contextLength: context,
    maxCompletionTokens: null,
    inputModalities: ['text'],
    outputModalities: ['text'],
    inputPerMillion: input,
    outputPerMillion: output,
    cacheReadPerMillion: null,
    cacheWritePerMillion: null,
    detailsPath: null,
  };
}

function endpoint(tag: string, input: number, latency: number, throughput: number): EndpointInfo {
  return {
    tag,
    providerName: tag.split('/')[0] ?? tag,
    endpointName: tag,
    modelId: 'x',
    inputPerMillion: input,
    outputPerMillion: input * 2,
    cacheReadPerMillion: null,
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
    uptime30m: 100,
    uptime1d: 100,
    supportsImplicitCaching: false,
    supportedParameters: [],
    priceOverrides: [],
    lastUpdated: '2026-11-08T10:00:00.000Z',
  };
}

const MODELS = [
  model('a/cheap-fast', 'Cheap Fast', 0.1, 0.2, 128000),
  model('b/expensive-slow', 'Expensive Slow', 5, 10, 1000000),
  model('c/mid', 'Mid Model', 1, 2, 32000),
];
const ENDPOINTS = {
  'a/cheap-fast': [endpoint('deepinfra', 0.1, 300, 80)],
  'c/mid': [endpoint('openai', 1, 900, 30), endpoint('azure', 0.9, 800, 20)],
};

const BASE: BrowserState = {
  query: '',
  page: 0,
  sort: 'name',
  direction: 'asc',
  provider: '',
  minContext: '',
  maxInput: '',
  maxOutput: '',
  availableOnly: false,
};

test('search matches name, id, and author', () => {
  assert.deepEqual(filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, query: 'cheap' }).map((m) => m.id), ['a/cheap-fast']);
  assert.deepEqual(filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, query: 'c/mid' }).map((m) => m.id), ['c/mid']);
  assert.deepEqual(filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, query: 'b/' }).map((m) => m.id), ['b/expensive-slow']);
});

test('price and context filters exclude unknown values', () => {
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, maxInput: '1' }).map((m) => m.id),
    ['a/cheap-fast', 'c/mid'],
  );
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, minContext: '500000' }).map((m) => m.id),
    ['b/expensive-slow'],
  );
});

test('provider and availability filters use loaded endpoint data only', () => {
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, provider: 'azure' }).map((m) => m.id),
    ['c/mid'],
  );
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, availableOnly: true }).map((m) => m.id),
    ['a/cheap-fast', 'c/mid'],
  );
});

test('sorting puts missing values last in both directions', () => {
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, sort: 'input', direction: 'asc' }).map((m) => m.id),
    ['a/cheap-fast', 'c/mid', 'b/expensive-slow'],
  );
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, sort: 'input', direction: 'desc' }).map((m) => m.id),
    ['b/expensive-slow', 'c/mid', 'a/cheap-fast'],
  );
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, sort: 'throughput', direction: 'desc' }).map((m) => m.id),
    ['a/cheap-fast', 'c/mid', 'b/expensive-slow'],
  );
});

test('sorting by provider count reports loaded endpoints', () => {
  assert.deepEqual(
    filterAndSortModels(MODELS, ENDPOINTS, { ...BASE, sort: 'providers', direction: 'desc' }).map((m) => m.id),
    ['c/mid', 'a/cheap-fast', 'b/expensive-slow'],
  );
});
