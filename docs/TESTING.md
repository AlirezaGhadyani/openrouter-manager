# Testing and verification

## Commands

```sh
npm run typecheck   # tsc --noEmit, strict
npm test            # node --test --experimental-transform-types test/*.test.ts
npm run build       # esbuild, then copy panel/style.css
npm run check       # typecheck + tests + build + scripts/check-package.mjs
```

`npm run check` passed at the time of writing:

- 70 tests, 70 passing, 0 failing.
- Manifest accepted by `parseManifestJson` from `@openchamber/sdk@2.7.0`.
- `plugin/index.js` has no static imports and no `require(`, default-exports `{ id, setup }`, and registers `http.request`.
- `panel/main.js` uses `connectHost`.
- Version in `src/shared/version.ts`, `package.json`, and `plugin/package.json` is `1.0.0`.
- Pinned SDK `2.7.0`, engine `>=2.7.0`.

## What the tests cover

| Area | Tests |
|---|---|
| Policy → OpenRouter object | only/ignore/order, fallbacks, sort + partition, max_price prompt/completion/image/request, latency/throughput percentiles, quantizations, data collection, ZDR, require parameters, distillable text |
| Honesty rules | empty policy sends nothing; cache-read ceiling is never sent; partition without sort ignored; missing values remain null |
| Validation | only/exclude need providers; invalid slugs; order outside only; overlap with exclude; non-positive limits; local cache warning |
| Overrides | merge, null removal, arrays replace, diff round-trip |
| Model matching | exact id, `:nitro`/`:floor`, aliases, no fuzzy/name matching, `:free` is distinct |
| Config | defaults, round-trip, invalid JSON, newer schema read-only, schema 0 migration, missing profile, sanitization, fingerprint, excluded count, partition-only overrides, cleared quantization lists |
| Config persistence | create on first open, fingerprint-guarded save, conflict rejection, atomic host write, reset backup path |
| Catalog/endpoints | normalization, per-million conversion, percentile parsing, null metrics, status codes, overrides, endpoint path, cache TTL, force refresh, stale fallback on 500/429 |
| History | hourly append, cap |
| Injection | request preservation, existing `provider` merge, `max_price` merge, model unchanged, no policy/disabled/wrong provider/wrong host/non-JSON pass-through |
| Plugin lifecycle | default export shape, hook registration, real `Request` rewrite, abort signal preserved, no content-length, status report with revision/model/fields, missing and invalid config |
| UI logic | search by name/id/author, price/context filters, provider filter, availability, sorting incl. N/A last, provider count sort |
| Analytics | provider rollups, medians, wins, leaders, coverage, local snapshot shape |

The plugin test uses a real `Request` to `https://openrouter.ai/api/v1/chat/completions` and calls the exact handler `setup` registered. It asserts the rewritten body and that every unrelated field survives.

## Real OpenCode load test

Performed in an isolated home with the installed OpenCode **2.2.6** binary:

- Config: a custom OpenAI-compatible provider `mock` pointing at a local mock server, plus `plugins: ["<path-to-openrouter-manager>/plugin"]`.
- `opencode run --standalone -m mock/deepseek/x "hi"`.
- Result: the run completed (`ok` from the mock), OpenCode watched and loaded `plugin/index.js`, and the plugin wrote:

```json
{
  "pluginVersion": "1.0.0",
  "writtenAt": "2026-11-08T11:16:36.035Z",
  "appliedCount": 0,
  "openCodeVersion": "2.2.6",
  "configRevision": 0,
  "configUpdatedAt": "2026-11-08T11:16:35.603Z"
}
```

This proves the OpenChamber-style plugin folder, `{ id, setup }` export, Node built-in access without imports, config reading, and `http.request` hook registration work in the real managed runtime.

The first mock run used a loopback address, so the unmodified plugin correctly did **not** rewrite it (it only touches `*.openrouter.ai`).

### Request rewrite inside OpenCode

A second run used a **test-only copy** of the bundle with one line changed (`isOpenRouterUrl` returns true). This is not the shipped artifact; it removes only the host restriction so a local mock can stand in for OpenRouter. With `providerIds: ["mock"]` and a policy for `deepseek/x`, the mock received:

```json
{"model":"deepseek/x","provider":{"sort":"price","max_price":{"prompt":0.4}},"stream":true, ...}
```

Both the title request and the main completion carried the provider object, kept the model and `stream`, and the run completed. The plugin's status then reported:

```json
{
  "pluginVersion": "1.0.0",
  "appliedCount": 1,
  "openCodeVersion": "2.2.6",
  "configRevision": 0,
  "lastApplied": {
    "requestKind": "title",
    "providerID": "mock",
    "modelID": "deepseek/x",
    "routingKey": "deepseek/x",
    "profileId": "cheapest",
    "providerKeys": ["sort", "max_price"]
  }
}
```

So the hook, request replacement (including body, headers, abort signal), policy resolution, profile + override merge, and diagnostic report all work in OpenCode 2.2.6's Bun runtime.

## Visual checks (mock OpenChamber host)

`test-harness/host.html` implements the SDK wire protocol and answers with a sample catalog, endpoint percentiles (including nulls), key metadata, and a missing config file. Checked in Chrome:

- Overview renders with catalog stats, connection card, runtime empty state, recent changes, quick actions.
- Models view loads the catalog and provider counts (concurrency 3), sorting, filters, pagination.
- Model detail renders provider comparison with independent price/cache/latency/throughput columns, highlights, filters, horizontal scroll, sticky provider column.
- Routing editor: profile selection loads `sort: price`, live JSON preview updates, unsaved indicator, save writes through the host and becomes “Saved policy”, header badge changes to “Profile: Cheapest”.
- Exclude flow: confirmation modal, save, header becomes “Custom policy”, routing editor shows `ignore: ["deepinfra"]`.
- Profiles editor, bulk assignment form, analytics leaderboard and model leaders, settings cards.
- Light and dark theme, 1440 px and narrow (~500 px) layouts.
- Fixed during this check: a re-entrant router update that mounted a view twice when the first endpoint load emitted during construction.

These are visual/flow checks on a mock host, not a substitute for an install.

## Not verified here

- **Installing this package in the user's OpenChamber** and observing the managed OpenCode config entry. This requires the user to add the folder once (the final message provides the install link).
- **A real request to the actual `openrouter.ai` host with the shipped host restriction.** It needs the user's key and spends credits. The rewrite path itself was proven against a mock in the real runtime (above); what remains is the live host. After installation:
  1. Assign a policy to a model.
  2. Send one request with that model.
  3. Open the extension's Overview or Settings → Configuration sync. The Runtime card should show `lastApplied` with the model, routing key, profile, and field names.
  4. Optionally inspect the OpenRouter generation/activity record for the provider used.
- **OpenChamber on Windows/macOS.** Path handling uses home-directory resolution and forward slashes accepted by Node; not executed there.
- **Very large catalogs beyond the current 461 models.** Pagination and 3-way concurrency are in place; no stress test was run.

Report any failure with: extension version, OpenChamber version, OpenCode version, the routing key shown in Runtime, and the contents of `routing.json` and `runtime-status.json` **with secrets removed** (there should be none in either file).
