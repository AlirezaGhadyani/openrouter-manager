import assert from 'node:assert/strict';
import test from 'node:test';
import {
  diffPolicy,
  emptyPolicy,
  isPolicyEmpty,
  mergePolicy,
  policyToProvider,
  sanitizePolicy,
  validatePolicy,
} from '../src/shared/policy.ts';

test('an empty policy produces no provider object', () => {
  assert.equal(policyToProvider(emptyPolicy()), null);
  assert.equal(isPolicyEmpty(emptyPolicy()), true);
});

test('only and exclude are mutually exclusive by mode', () => {
  const only = { ...emptyPolicy(), mode: 'only' as const, providers: ['deepinfra', 'together'] };
  assert.deepEqual(policyToProvider(only), { only: ['deepinfra', 'together'] });

  const exclude = { ...emptyPolicy(), mode: 'exclude' as const, providers: ['openai'] };
  assert.deepEqual(policyToProvider(exclude), { ignore: ['openai'] });
});

test('provider slugs are normalized, deduplicated, and invalid values dropped', () => {
  const policy = sanitizePolicy({
    mode: 'only',
    providers: [' DeepInfra ', 'deepinfra', 'bad slug', 'google-vertex/us-east5'],
  });
  assert.deepEqual(policy.providers, ['deepinfra', 'google-vertex/us-east5']);
});

test('sort, partition, fallbacks, and price ceilings map to documented fields', () => {
  const policy = {
    ...emptyPolicy(),
    allowFallbacks: false,
    sort: 'throughput' as const,
    partition: 'none' as const,
    maxPromptPerMillion: 0.5,
    maxCompletionPerMillion: 2,
    maxImagePrice: 0.01,
    maxRequestPrice: 0.002,
  };
  assert.deepEqual(policyToProvider(policy), {
    allow_fallbacks: false,
    sort: { by: 'throughput', partition: 'none' },
    max_price: { prompt: 0.5, completion: 2, image: 0.01, request: 0.002 },
  });
});

test('latency and throughput thresholds use the chosen percentile', () => {
  const policy = {
    ...emptyPolicy(),
    maxLatencySeconds: 2,
    maxLatencyPercentile: 'p90' as const,
    minThroughputTps: 60,
    minThroughputPercentile: 'p50' as const,
  };
  assert.deepEqual(policyToProvider(policy), {
    preferred_max_latency: { p90: 2 },
    preferred_min_throughput: { p50: 60 },
  });
});

test('advanced fields are only emitted when set', () => {
  const policy = {
    ...emptyPolicy(),
    quantizations: ['fp8', 'fp16'],
    dataCollection: 'deny' as const,
    zdr: true,
    requireParameters: true,
    enforceDistillableText: true,
  };
  assert.deepEqual(policyToProvider(policy), {
    quantizations: ['fp8', 'fp16'],
    data_collection: 'deny',
    zdr: true,
    require_parameters: true,
    enforce_distillable_text: true,
  });
});

test('a cache-read preference never reaches the OpenRouter object', () => {
  const policy = { ...emptyPolicy(), localMaxCacheReadPerMillion: 0.05 };
  assert.equal(policyToProvider(policy), null);
});

test('partition without a sort is ignored', () => {
  const policy = { ...emptyPolicy(), partition: 'none' as const };
  assert.equal(policyToProvider(policy), null);
});

test('validation rejects an empty provider list in only mode', () => {
  const issues = validatePolicy({ ...emptyPolicy(), mode: 'only' });
  assert.equal(issues.some((issue) => issue.severity === 'error'), true);
});

test('validation warns about a local cache ceiling', () => {
  const issues = validatePolicy({ ...emptyPolicy(), localMaxCacheReadPerMillion: 1 });
  assert.equal(issues.some((issue) => issue.field === 'localMaxCacheReadPerMillion' && issue.severity === 'warning'), true);
});

test('overrides merge over a profile and null removes an inherited field', () => {
  const base = { ...emptyPolicy(), sort: 'price' as const, maxPromptPerMillion: 1, allowFallbacks: false };
  const merged = mergePolicy(base, { maxPromptPerMillion: 0.2, sort: null });
  assert.equal(merged.maxPromptPerMillion, 0.2);
  assert.equal(merged.sort, undefined);
  assert.equal(merged.allowFallbacks, false);
});

test('diffPolicy records additions, changes, and removals', () => {
  const base = { ...emptyPolicy(), sort: 'price' as const, maxPromptPerMillion: 1, providers: ['a'] };
  const edited = { ...base, sort: 'latency' as const, maxPromptPerMillion: undefined, providers: ['a', 'b'] };
  const diff = diffPolicy(base, edited);
  assert.equal(diff.sort, 'latency');
  assert.equal(diff.maxPromptPerMillion, null);
  assert.deepEqual(diff.providers, ['a', 'b']);
  const round = mergePolicy(base, diff);
  assert.deepEqual(round, sanitizePolicy(edited));
});

test('arrays replace rather than append when merging', () => {
  const base = { ...emptyPolicy(), mode: 'only' as const, providers: ['a', 'b'] };
  const merged = mergePolicy(base, { providers: ['c'] });
  assert.deepEqual(merged.providers, ['c']);
});
