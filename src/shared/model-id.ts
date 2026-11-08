/**
 * Canonical model matching.
 *
 * OpenRouter model ids are canonical slugs (`deepseek/deepseek-v4.1-flash-1017`).
 * OpenCode may pass a routing variant with a suffix (`:nitro`, `:floor`), and
 * the catalog exposes a `canonical_slug` that can differ from the id used in
 * requests. We never match on display names.
 */

/** Suffixes that are routing variants of the same model, not other models. */
export const ROUTING_VARIANT_SUFFIXES = [':nitro', ':floor'] as const;

/** Strip a known routing-variant suffix. Other suffixes are preserved. */
export function canonicalModelId(raw: string): string {
  let id = raw.trim();
  for (let i = 0; i < 2; i++) {
    const lower = id.toLowerCase();
    const suffix = ROUTING_VARIANT_SUFFIXES.find((candidate) => lower.endsWith(candidate));
    if (!suffix) break;
    id = id.slice(0, -suffix.length);
  }
  return id;
}

/** `author/slug` -> author. Returns an empty string when there is no slash. */
export function modelAuthor(id: string): string {
  const index = id.indexOf('/');
  return index === -1 ? '' : id.slice(0, index);
}

/**
 * Find the routing key for a request model id.
 *
 * Order: exact id, id with routing suffix removed, alias of either, then one
 * alias hop. Unknown ids return `null`, so a model without a configuration is
 * untouched.
 */
export function resolveRoutingKey(
  rawId: string,
  models: Readonly<Record<string, unknown>>,
  aliases: Readonly<Record<string, string>>,
): string | null {
  const id = rawId.trim();
  if (!id) return null;
  const candidates = [id];
  const base = canonicalModelId(id);
  if (base !== id) candidates.push(base);

  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(models, candidate)) return candidate;
  }
  for (const candidate of candidates) {
    const alias = aliases[candidate];
    if (alias && Object.prototype.hasOwnProperty.call(models, alias)) return alias;
  }
  return null;
}

/** Add `canonical_slug -> id` entries without overwriting an existing id key. */
export function learnAliases(
  aliases: Readonly<Record<string, string>>,
  entries: ReadonlyArray<{ id: string; canonicalSlug?: string }>,
): Record<string, string> {
  const next: Record<string, string> = { ...aliases };
  for (const entry of entries) {
    const slug = entry.canonicalSlug?.trim();
    if (!slug || slug === entry.id) continue;
    if (!Object.prototype.hasOwnProperty.call(next, slug)) next[slug] = entry.id;
  }
  return next;
}
