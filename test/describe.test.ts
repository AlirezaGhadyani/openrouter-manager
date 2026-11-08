import assert from 'node:assert/strict';
import test from 'node:test';
import { describePolicy, emptyPolicy } from '../src/shared/policy.ts';

test('an empty policy says OpenRouter decides', () => {
  assert.deepEqual(describePolicy(emptyPolicy()), ['No rules. OpenRouter chooses the provider.']);
});

test('provider rules read as sentences and long lists are shortened', () => {
  const lines = describePolicy({
    ...emptyPolicy(),
    mode: 'only',
    providers: ['deepinfra', 'together', 'fireworks', 'azure', 'openai'],
    allowFallbacks: false,
  });
  assert.equal(lines[0], 'Uses only deepinfra, together, fireworks and 2 more.');
  assert.equal(lines[1], 'Does not fall back to other providers if the chosen ones fail.');
});

test('limits and speed preferences state units and percentiles', () => {
  const lines = describePolicy({
    ...emptyPolicy(),
    sort: 'throughput',
    maxPromptPerMillion: 0.5,
    minThroughputTps: 60,
    minThroughputPercentile: 'p90',
  });
  assert.ok(lines.includes('Prefers the fastest output speed.'));
  assert.ok(lines.includes('Skips providers charging more than $0.5 per million input tokens.'));
  assert.ok(lines.includes('Prefers providers that generate at least 60 tokens/s (P90).'));
});
