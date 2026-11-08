import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalModelId, learnAliases, modelAuthor, resolveRoutingKey } from '../src/shared/model-id.ts';

test('routing variants reduce to the canonical model id', () => {
  assert.equal(canonicalModelId('deepseek/deepseek-v4.1-flash-1017:nitro'), 'deepseek/deepseek-v4.1-flash-1017');
  assert.equal(canonicalModelId('deepseek/deepseek-v4.1-flash-1017:floor'), 'deepseek/deepseek-v4.1-flash-1017');
  assert.equal(canonicalModelId('deepseek/deepseek-v4.1-flash-1017:NITRO'), 'deepseek/deepseek-v4.1-flash-1017');
  assert.equal(canonicalModelId('deepseek/deepseek-v4.1-flash-1017:free'), 'deepseek/deepseek-v4.1-flash-1017:free');
  assert.equal(canonicalModelId('  deepseek/x  '), 'deepseek/x');
});

test('author is the first path segment', () => {
  assert.equal(modelAuthor('deepseek/deepseek-v4.1'), 'deepseek');
  assert.equal(modelAuthor('no-slash'), '');
});

test('exact ids win, then routing variants, then aliases', () => {
  const models = { 'deepseek/model-a': {}, 'deepseek/model-a:nitro': {} };
  assert.equal(resolveRoutingKey('deepseek/model-a', models, {}), 'deepseek/model-a');
  assert.equal(resolveRoutingKey('deepseek/model-a:nitro', models, {}), 'deepseek/model-a:nitro');
  assert.equal(
    resolveRoutingKey('deepseek/model-a:floor', { 'deepseek/model-a': {} }, {}),
    'deepseek/model-a',
  );
  assert.equal(
    resolveRoutingKey('deepseek/canonical-slug', { 'deepseek/model-a': {} }, { 'deepseek/canonical-slug': 'deepseek/model-a' }),
    'deepseek/model-a',
  );
});

test('unknown models never match by similarity', () => {
  const models = { 'deepseek/deepseek-v4.1-flash-1017': {} };
  assert.equal(resolveRoutingKey('deepseek/deepseek-v4.1-flash', models, {}), null);
  assert.equal(resolveRoutingKey('deepseek/deepseek-v4.1-flash-1017-preview', models, {}), null);
  assert.equal(resolveRoutingKey('other/deepseek-v4.1-flash-1017', models, {}), null);
});

test('learning aliases keeps existing mappings', () => {
  const aliases = learnAliases({}, [
    { id: 'deepseek/model-a', canonicalSlug: 'deepseek/model-a-2026' },
    { id: 'deepseek/model-b', canonicalSlug: 'deepseek/model-b-2026' },
  ]);
  assert.deepEqual(aliases, {
    'deepseek/model-a-2026': 'deepseek/model-a',
    'deepseek/model-b-2026': 'deepseek/model-b',
  });
  assert.deepEqual(learnAliases(aliases, [{ id: 'deepseek/model-a', canonicalSlug: 'deepseek/model-a-2026' }]), aliases);
});
