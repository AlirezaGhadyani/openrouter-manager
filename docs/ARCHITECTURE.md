# Architecture

## Verified integration points

Nothing here is assumed. The design rests on five facts checked against the installed host and the vendor docs.

| Fact | Evidence |
|---|---|
| An extension can ship code that runs inside OpenCode | `@openchamber/sdk@2.7.0` manifest key `contributes.opencodePlugin`, parsed successfully by the host SDK; the host lists the folder in its **managed** OpenCode config (`opencode.managed.json`) |
| A plugin entry is `default { id, setup }` with no static imports | OpenChamber extensions skill and SDK `API.md`; the host's own managed plugin uses this shape |
| OpenCode 2.2.6 runs a request hook that can replace the request | `session.hook("http.request", ...)` in the V2 plugin docs; the installed OpenCode binary contains `trigger("session","http.request",{...request})` and uses the returned `request`, allowing a replacement `Request` |
| The hook sees the final OpenRouter body | OpenRouter is a native OpenCode protocol (`openrouter-chat`, `openrouter-responses`); the hook runs after protocol lowering and before the driver sends |
| OpenRouter returns endpoint percentiles only to authenticated calls | Official `PublicEndpoint` schema: latency ms, throughput tokens/sec, `null` without a key; confirmed against the live API |

## Components

```
panel (sandboxed iframe)
  └─ host.request ──► OpenChamber integration proxy ──► openrouter.ai/api/v1
  └─ host.readFile / writeFile ──► ~/.config/openrouter-manager/
                                      ├─ routing.json          source of truth
                                      ├─ runtime-status.json   plugin diagnostics
                                      └─ cache/                catalog + endpoints

OpenCode (managed runtime)
  └─ plugin/index.js
       ├─ reads routing.json (mtime-cached, 100 ms debounce)
       ├─ resolves the model policy
       ├─ rewrites the outgoing JSON body before dispatch
       └─ writes runtime-status.json (throttled)
```

No service, daemon, socket, or second store. The panel and the plugin share one file.

## Why the request hook, not provider options

OpenCode exposes several possible seams. The plugin uses `http.request` because it is the last point before dispatch, it sees the exact body OpenRouter receives, and it is protocol-independent. It avoids relying on the AI SDK's provider-option naming, which can differ per protocol and version.

The hook:

1. Ignores non-`POST`, non-JSON, non-openrouter.ai requests.
2. Parses the JSON body and reads `body.model` (the model actually served).
3. Resolves an exact policy by canonical id or a learned alias. No display-name matching.
4. Builds only documented `provider` fields.
5. Merges them into any existing `body.provider` (keys the policy sets win; all other body fields and unknown provider keys are untouched).
6. Replaces `event.request` with a new `Request` built from the original (so method, signal, redirect, credentials, and other init survive), with a new body. Bodies over 16 MiB are left untouched to bound memory.
7. Records what it applied in `runtime-status.json` (at most every 2 seconds).

If anything fails — missing file, invalid JSON, unknown model, network shape change — the original request passes through unchanged. A routing feature must never break a model call.

## Source of truth and synchronization

- **Write:** the panel validates, then calls `host.writeFile`, which is atomic (temp + rename).
- **Read:** the plugin stats the file on each request (100 ms debounce). A save is visible to the next request.
- **Concurrency:** the panel keeps the fingerprint of the text it loaded. Every save re-reads the file; if the fingerprint differs, the save is refused with a visible conflict banner. The user reloads explicitly. Nothing silently overwrites an external change.
- **Runtime report:** the plugin writes its loaded revision, OpenCode version, applied count, last model, routing key, profile, and the field names sent. The UI compares that revision with the saved one and says that a newer revision applies at the next request.
- **Reloads and upgrades:** the file survives extension disable/update/uninstall (the extension does not delete it). On re-enable, the panel reads it again and the plugin is re-listed by the host.
- **Migration:** `schemaVersion` is explicit; schema 0 migrates to 1. A pre-migration backup is written before the first save of migrated data. A newer schema is read-only.

## Model matching

1. Exact `body.model` id in `config.models`.
2. The same id with a documented routing suffix removed (`:nitro`, `:floor`).
3. `config.aliases` learned from `canonical_slug` when a model is assigned.
4. One alias hop, then stop.

Unmatched ids are left alone. Display names are never compared. If OpenRouter renames or removes a model, its old policy remains stored but does nothing; the model detail view reports that the model is missing from the catalog.

## Data layer

- `GET /api/v1/models` is cached for 6 hours.
- `GET /api/v1/models/{author}/{slug}/endpoints` is cached per model for 10 minutes.
- A failed refresh returns the last good copy and marks it stale instead of blanking the UI.
- One retry is not attempted: 429/5xx surface with a clear message and a manual retry, so the extension does not hammer a rate-limited API.
- Prices convert from USD per token (strings) to USD per million tokens. Image/request prices stay per unit.
- Latency is milliseconds; routing thresholds are seconds. Throughput is tokens/sec in both places.
- Endpoint caches and the catalog feed analytics. Coverage is displayed, not implied.

## Security

- The API key is an OpenChamber **integration credential**. The page calls `host.request`; the host attaches the token. The key is never in the iframe, the plugin, the config file, generated JSON, or logs.
- `contributes.filesystem` is limited to `~/.config/openrouter-manager/**`.
- The plugin requires `https:` and the exact host `openrouter.ai`; it cannot rewrite arbitrary provider traffic. Regional `eu.`/`us.` hosts are intentionally not intercepted.
- Runtime errors are caught and never rethrown into the model call.
- Token, account, and usage values are read from `GET /api/v1/key`, which returns metadata only.

## Performance

- The panel has one script and one stylesheet; no framework, no runtime module loader.
- At most three endpoint requests run at once. The model list loads endpoints only for the visible page.
- Catalog/endpoint caching prevents repeated calls; manual refresh bypasses TTL.
- The plugin does a `stat`, then reads only when mtime or size changed. Status writes are throttled and diagnostic only.

## Determinism and failure containment

| Failure | Behavior |
|---|---|
| Config missing | No injection; status says the file is missing |
| Config invalid JSON | No injection; status carries the parse error |
| Config from a newer schema | Panel read-only; plugin treats it as invalid and leaves requests alone |
| Unknown model | No injection |
| OpenRouter API down | Stale cache, visible warning |
| 401/403 | Clear “reconnect the key” message |
| 429 | Clear rate-limit message; cache preserved |
| Plugin cannot write status | Routing continues; status file is best-effort |
| Request body is not JSON | Passed through |

## File map

```
src/shared/      pure, browser-safe policy/config/normalization/injection logic
src/plugin/      OpenCode plugin entry; bundled to plugin/index.js with no imports
src/data/        host bridge, OpenRouter client, cache/config repository
src/panel/       store, DOM layer, routing editor, views
test/            unit + plugin lifecycle tests (70)
scripts/         esbuild build and package validation
panel/           built HTML/JS/CSS
plugin/          built plugin folder (index.js + package.json)
test-harness/    mock OpenChamber host for visual checks
```
