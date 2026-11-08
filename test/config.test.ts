import assert from 'node:assert/strict';
import test from 'node:test';
import {
  builtinProfiles,
  countCustomModels,
  countExcludedProviders,
  createDefaultConfig,
  effectivePolicy,
  fingerprint,
  parseConfig,
  sanitizeOverride,
  serializeConfig,
} from '../src/shared/config.ts';
import { diffPolicy, mergePolicy, policyToProvider } from '../src/shared/policy.ts';

const NOW = Date.parse('2026-11-08T10:00:00.000Z');

test('a new config has built-in profiles and no model routing', () => {
  const config = createDefaultConfig(NOW);
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.revision, 0);
  assert.deepEqual(
    config.profiles.map((profile) => profile.id),
    builtinProfiles(NOW).map((profile) => profile.id),
  );
  assert.deepEqual(config.models, {});
  assert.equal(config.settings.enabled, true);
});

test('serialize then parse is lossless for a configured model', () => {
  const config = createDefaultConfig(NOW);
  config.models['deepseek/model-a'] = {
    profileId: 'cheapest',
    overrides: { maxPromptPerMillion: 0.3, sort: 'latency' },
    customized: true,
    updatedAt: new Date(NOW).toISOString(),
  };
  config.aliases['deepseek/model-a-2026'] = 'deepseek/model-a';
  const parsed = parseConfig(serializeConfig(config), NOW);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.config, config);
});

test('invalid JSON is reported, not repaired', () => {
  const parsed = parseConfig('{oops', NOW);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.config, null);
});

test('a newer schema is read-only', () => {
  const parsed = parseConfig(JSON.stringify({ schemaVersion: 9 }), NOW);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.readOnly, true);
});

test('schema 0 is migrated and reported', () => {
  const parsed = parseConfig(JSON.stringify({ revision: 2, models: {} }), NOW);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.migratedFrom, 0);
  assert.equal(parsed.config?.schemaVersion, 1);
});

test('a model pointing at a missing profile keeps its overrides', () => {
  const config = createDefaultConfig(NOW);
  config.profiles = config.profiles.filter((profile) => profile.id !== 'cheapest');
  config.models['deepseek/model-a'] = {
    profileId: 'cheapest',
    overrides: { maxCompletionPerMillion: 2 },
    customized: true,
    updatedAt: new Date(NOW).toISOString(),
  };
  const parsed = parseConfig(JSON.stringify(config), NOW);
  assert.equal(parsed.config?.models['deepseek/model-a']?.profileId, null);
  assert.equal(parsed.config?.models['deepseek/model-a']?.overrides.maxCompletionPerMillion, 2);
  assert.equal(parsed.issues.some((issue) => issue.severity === 'warning'), true);
});

test('unknown settings and provider ids are sanitized', () => {
  const parsed = parseConfig(
    JSON.stringify({
      schemaVersion: 1,
      settings: { enabled: false, providerIds: ['openrouter', 'OpenRouter', 'bad id'] },
    }),
    NOW,
  );
  assert.equal(parsed.ok, true);
  assert.equal(parsed.config?.settings.enabled, false);
  assert.deepEqual(parsed.config?.settings.providerIds, ['openrouter']);
});

test('effective policy merges profile and overrides', () => {
  const config = createDefaultConfig(NOW);
  config.models['deepseek/model-a'] = {
    profileId: 'cheapest',
    overrides: { maxPromptPerMillion: 0.1 },
    customized: true,
    updatedAt: new Date(NOW).toISOString(),
  };
  const effective = effectivePolicy(config, 'deepseek/model-a');
  assert.equal(effective?.profileId, 'cheapest');
  assert.equal(effective?.policy.sort, 'price');
  assert.equal(effective?.policy.maxPromptPerMillion, 0.1);
  assert.deepEqual(policyToProvider(effective!.policy), { sort: 'price', max_price: { prompt: 0.1 } });
});

test('excluded provider count uses effective policies', () => {
  const config = createDefaultConfig(NOW);
  config.models.a = {
    profileId: null,
    overrides: { mode: 'exclude', providers: ['openai', 'azure'] },
    customized: true,
    updatedAt: new Date(NOW).toISOString(),
  };
  config.models.b = {
    profileId: null,
    overrides: { mode: 'exclude', providers: ['openai'] },
    customized: true,
    updatedAt: new Date(NOW).toISOString(),
  };
  assert.equal(countExcludedProviders(config), 2);
  assert.equal(countCustomModels(config), 2);
});

test('override sanitizing preserves null removals', () => {
  assert.deepEqual(sanitizeOverride({ maxPromptPerMillion: null, sort: 'price' }), {
    maxPromptPerMillion: null,
    sort: 'price',
  });
  assert.deepEqual(sanitizeOverride({ maxPromptPerMillion: -1, sort: 'nope' }), {});
});

test('fingerprint changes with content and is stable', () => {
  assert.equal(fingerprint('abc'), fingerprint('abc'));
  assert.notEqual(fingerprint('abc'), fingerprint('abd'));
  assert.match(fingerprint('abc'), /^[0-9a-f]{8}$/);
});

test('a partition-only override and a cleared quantization list survive a file round-trip', () => {
  const config = createDefaultConfig(NOW);
  const base = config.profiles.find((profile) => profile.id === 'cheapest')!;
  base.policy.quantizations = ['fp8'];
  const edited = {
    ...base.policy,
    partition: 'none' as const,
    quantizations: [],
  };
  const overrides = diffPolicy(base.policy, edited);
  config.models['deepseek/model-a'] = {
    profileId: 'cheapest',
    overrides,
    customized: true,
    updatedAt: new Date(NOW).toISOString(),
  };
  const parsed = parseConfig(serializeConfig(config), NOW);
  assert.equal(parsed.ok, true);
  const saved = parsed.config!.models['deepseek/model-a']!.overrides;
  assert.equal(saved.partition, 'none');
  assert.deepEqual(saved.quantizations, []);
  const effective = effectivePolicy(parsed.config!, 'deepseek/model-a')!;
  assert.deepEqual(policyToProvider(effective.policy), { sort: { by: 'price', partition: 'none' } });
  const merged = mergePolicy(base.policy, { partition: 'none' });
  assert.equal(merged.partition, 'none');
});
