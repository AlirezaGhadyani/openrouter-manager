# API capabilities and limitations

This file records what the extension sends, what it refuses to pretend, and why.

## OpenRouter routing object actually sent

Only documented fields are produced, and only when set:

| Field | Source in the editor | Unit / values |
|---|---|---|
| `order` | Priority order | Provider slugs or endpoint tags |
| `only` | Provider selection → Only | Slugs/tags |
| `ignore` | Provider selection → Exclude | Slugs/tags |
| `allow_fallbacks` | “Allow fallbacks” off | `false` only; omitted when true (OpenRouter default) |
| `sort` | Sort strategy (+ partition) | `price`, `latency`, `throughput`; optional `{by, partition}` |
| `max_price.prompt` | Maximum input price | USD per **million** tokens |
| `max_price.completion` | Maximum output price | USD per **million** tokens |
| `max_price.image` | Maximum image price | USD per **image** |
| `max_price.request` | Maximum request price | USD per **request** |
| `preferred_max_latency` | Preferred max latency | `{p50/p75/p90/p99: seconds}` |
| `preferred_min_throughput` | Preferred min throughput | `{p50/p75/p90/p99: tokens/sec}` |
| `quantizations` | Quantizations | e.g. `fp8`, `fp16`, `int4` |
| `data_collection` | Data collection | `allow` / `deny` |
| `zdr` | Zero data retention | `true` only |
| `require_parameters` | Require parameters | `true` only |
| `enforce_distillable_text` | Distillable text | `true` only |

Not sent, by design:

- **Cache-read price ceiling.** OpenRouter has no such routing field. The editor stores `localMaxCacheReadPerMillion` in the config and labels it “Local only”. It is used to flag providers; it never reaches a request.
- **Display names, model aliases not in the catalog, or guessed provider lists.**
- **Any custom or undocumented field.**

## Data endpoints

| Endpoint | Use | Auth |
|---|---|---|
| `GET /api/v1/models` | Catalog, model prices, modalities, context, canonical slug, endpoint link | Public, but this extension calls through the integration |
| `GET /api/v1/models/{author}/{slug}/endpoints` | Provider rows, endpoint pricing, percentiles, uptime, status | Public pricing; **percentiles only with a key** |
| `GET /api/v1/key` | Connection test and key metadata | Requires the key |

Pricing strings are USD **per token**; the UI multiplies by 1,000,000 for token prices. `image` and `request` are per-unit and are not multiplied.

### Percentiles

`latency_last_30m` and `throughput_last_30m` are objects:

```json
{ "p50": 240.5, "p75": 340.1, "p90": 610.2, "p99": 900 }
```

- Latency is **milliseconds**, time to first token.
- Throughput is **tokens per second**.
- The window is rolling 30 minutes.
- Without an authenticated request, the API returns `null`; the table shows N/A.
- There is no per-endpoint historical series, so the extension does not draw one. The local snapshot chart is collected by this extension and labelled as such.

### Endpoint status

`0` means operational; any non-zero value is shown as “Degraded (code)”. The extension does not invent meanings for individual codes.

### Cache pricing

- `input_cache_read` is displayed independently when present.
- `input_cache_write` is displayed independently when present; on OpenRouter it is frequently absent, so N/A is normal.
- Cache pricing is never combined with normal input pricing.
- `pricing.overrides` (time-of-day price schedules) are detected and marked “Time-based price”; the comparison uses the base price and says so.

### Image and request pricing

Some endpoints publish `image` and `request`. Both are shown as N/A elsewhere. `max_price.image` and `max_price.request` are exposed for routing.

## What OpenChamber provides and what it does not

- The extension page is sandboxed: no direct network, no direct filesystem, no host React components, no terminal.
- Network access is the declared integration origin (`https://openrouter.ai`) through `host.request`; the host attaches the credential.
- Filesystem access is limited to the declared globs under `~/.config/openrouter-manager/`.
- The bundled plugin runs inside OpenCode with the user's full access. It reads only the extension's config and writes only its status file.
- Extensions are unsupported in VS Code and on mobile. At least OpenChamber 2.7.0 is required for `opencodePlugin`.

## Model matching edge cases

| Case | Behavior |
|---|---|
| `model:nitro`, `model:floor` | Base policy applies; the sent model id is unchanged. OpenRouter's variant semantics can override `sort`. |
| `model:free` | Treated as a **different** model; no automatic match. Add an explicit alias/policy if desired. |
| `canonical_slug` differs from `id` | Alias is stored when the model is assigned; no global fuzzy matching. |
| Model removed by OpenRouter | Policy remains stored; no request matches it; the detail view says the model is missing. |
| Two models with similar names | Never matched. Matching is by id/alias only. |
| Custom provider id pointing at OpenRouter | The host must still be `*.openrouter.ai`; add the provider id under Settings → Routing. |

## Precedence and safety

- When a request already has a `provider` object, the extension's explicit keys replace those keys; other keys (and every other body field) survive.
- Requests to hosts other than `https://openrouter.ai`, non-POST requests, non-JSON bodies, and bodies without a `model` are passed through.
- Bodies over 16 MiB (declared or actual) are passed through unchanged to bound memory; this is unusual for text requests but possible for large inline media.
- The plugin preserves the original request's method, headers, abort signal, redirect, and credential settings by constructing from the original `Request`.

## Credential scope

OpenChamber's integration grant is per-origin, not per-path. The panel only issues `GET` requests to `/api/v1/models`, `/api/v1/models/{id}/endpoints`, and `/api/v1/key`; it does not expose a general request console. A compromised panel would still be constrained by the host's origin grant, which is the host's boundary rather than this extension's.

## Known gaps

1. **No end-to-end injection against the real OpenRouter host was run** in this environment. Doing so requires the user's key and spending credits. The hook was exercised directly with a real `Request` to `https://openrouter.ai/...`, and the plugin was loaded and run by OpenCode 2.2.6. See `TESTING.md`.
2. **No automatic retry** on 429/5xx; the UI asks the user to retry. This is deliberate to avoid amplifying rate limits.
3. **Analytics is partial** until endpoint data is loaded; the UI displays coverage (`n/N` models) instead of extrapolating.
4. **No write-back to `opencode.json`.** Routing lives in the extension file; the plugin is listed by OpenChamber's managed config. This avoids editing unrelated user configuration.
5. **No bulk import from an existing external router config.** Profiles can be created and applied, but there is no assumed external format to import safely.
6. **Regional routing hosts are not intercepted.** `eu.openrouter.ai` and `us.openrouter.ai` are documented OpenRouter hosts for in-region routing; this extension targets `https://openrouter.ai`, which is what OpenCode's OpenRouter provider uses.
7. **An alias is skipped when the canonical slug is another catalog model's id**, so a canonical slug can never silently borrow a different model's policy by accident.
