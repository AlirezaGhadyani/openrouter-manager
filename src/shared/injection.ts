import { effectivePolicy } from './config.ts';
import { resolveRoutingKey } from './model-id.ts';
import { policyToProvider as providerFromPolicy } from './policy.ts';
import type { ManagerConfig, OpenRouterProviderPreferences, ResolvedModelPolicy } from './types.ts';

export interface InjectionInput {
  config: ManagerConfig;
  providerID: string;
  modelID: string;
  body: unknown;
}

export interface InjectionResult {
  routingKey: string;
  profileId: string | null;
  provider: OpenRouterProviderPreferences;
  body: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Resolve a model's effective policy and provider object, or null for default routing. */
export function resolveModelPolicy(
  config: ManagerConfig,
  providerID: string,
  modelID: string,
): ResolvedModelPolicy | null {
  if (!config.settings.enabled) return null;
  if (!config.settings.providerIds.includes(providerID)) return null;
  const routingKey = resolveRoutingKey(modelID, config.models, config.aliases);
  if (!routingKey) return null;
  const resolved = effectivePolicy(config, routingKey);
  if (!resolved) return null;
  const { policy } = resolved;
  const provider = providerFromPolicy(policy);
  return { routingKey, profileId: resolved.profileId, policy, provider };
}


/**
 * Merge our routing object into an existing request body. Keys we set win;
 * every other body field (stream, tools, messages, response_format, ...) is
 * preserved untouched.
 */
export function injectProviderIntoBody(body: unknown, provider: OpenRouterProviderPreferences): Record<string, unknown> | null {
  if (!isRecord(body)) return null;
  const existing = isRecord(body.provider) ? body.provider : null;
  const merged: Record<string, unknown> = existing ? { ...existing } : {};

  for (const [key, value] of Object.entries(provider)) {
    if (value === undefined) continue;
    if (key === 'max_price' && isRecord(value) && isRecord(merged.max_price)) {
      merged.max_price = { ...merged.max_price, ...value };
    } else {
      merged[key] = value;
    }
  }

  return { ...body, provider: merged };
}

/** The model OpenRouter will actually serve, from the final body when present. */
export function bodyModelID(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.model === 'string' && body.model.trim()) return body.model.trim();
  return fallback;
}

export function applyInjection(input: InjectionInput): InjectionResult | null {
  const modelID = bodyModelID(input.body, input.modelID);
  const resolved = resolveModelPolicy(input.config, input.providerID, modelID);
  if (!resolved || !resolved.provider) return null;
  const body = injectProviderIntoBody(input.body, resolved.provider);
  if (!body) return null;
  return {
    routingKey: resolved.routingKey,
    profileId: resolved.profileId,
    provider: resolved.provider,
    body,
  };
}

export function isOpenRouterUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === 'openrouter.ai';
  } catch {
    return false;
  }
}

/** Only JSON API calls that carry a model are candidates. */
export function canCarryRouting(url: string, body: unknown): boolean {
  if (!isOpenRouterUrl(url)) return false;
  if (!isRecord(body)) return false;
  return typeof body.model === 'string' && body.model.trim().length > 0;
}
