# Troubleshooting

## The extension does not appear in Settings → Extensions

1. Confirm the folder has `package.json` with the `openchamber` block and that `engines.openchamber` is `>=2.7.0`.
2. From the folder, run `npm run check`. It validates the manifest with `@openchamber/sdk@2.7.0`, the built files, the plugin shape, and version sync.
3. Build before installing: `npm run build`. The extension never builds at install time.
4. The panel is a built file: if `panel/main.js` is missing or older than the sources, rebuild.
5. In VS Code or mobile, the extension catalog is unavailable.

## “OpenRouter is not connected”

The key is not stored by this extension. Connect it in **OpenChamber → Settings → Integrations → OpenRouter**, then press **Test connection** in the extension's Settings.

- A `401`/`403` after connecting means the key is invalid or lacks access; reconnect it.
- A `DISCONNECTED` host error means the integration token is missing, not that OpenRouter is down.
- The panel cannot display the key; that is deliberate.

## The plugin does not report (“No runtime report yet”)

The plugin runs only inside OpenCode and only while the extension is enabled.

1. Open **Settings → Extensions** and confirm OpenRouter Manager is enabled.
2. Check OpenChamber's managed OpenCode config (per instance under `~/.config/openchamber/run/instances/<pid>/opencode.managed.json`); the absolute path to `.../openrouter-manager/plugin` should be listed.
3. OpenCode reloads config and plugins on change. If needed, restart the OpenCode service once (`opencode service restart`) or reload the desktop app.
4. Inspect `~/.config/openrouter-manager/runtime-status.json`:
   - `pluginVersion` — must be the extension version.
   - `configRevision` — the revision loaded by OpenCode.
   - `configError` — a parse/read failure.
   - `lastApplied` — the last model and fields actually sent.
5. If the file is missing, the plugin never loaded. Check the OpenCode log for a plugin import error.

## A saved policy is not applied

Check, in order:

1. **Master switch.** Settings → Routing → “Apply routing policies”. Off means every request is untouched; the policies are preserved.
2. **Provider scope.** Settings → Routing → provider ids. Default `openrouter`. The request must also go to `https://openrouter.ai` (the `eu.`/`us.` regional hosts are not intercepted).
3. **Model match.** The runtime status shows `lastApplied.modelID` and `routingKey`. If a model is missing, its id may differ (canonical slug, alias, or a `:free` variant). Configure that exact model.
4. **Policy is empty.** A policy with only a local cache-read preference sends nothing; the JSON preview shows `{}`.
5. **Validation errors.** Save is disabled until errors are fixed.
6. **Variant semantics.** `:nitro`/`:floor` can override `sort` at OpenRouter. The extension does not rewrite the model id.
7. **Request kind.** `GET` requests, non-JSON bodies, and bodies without `model` are deliberately skipped.
8. **Newer revision.** A status revision lower than the saved revision means the next request will apply it. Routing is read per request, not pushed.

## “Configuration changed on disk”

The file was edited outside the panel (another window, a script, or another device). The panel refuses to save over it.

- Choose **Reload** to take the file on disk and discard the panel's assumptions.
- If the panel has unsaved form state, copy the JSON first; reloading replaces it.

The runtime is not affected: it reads the file directly and always uses the last atomic write.

## The configuration cannot be read

- **Invalid JSON:** the error screen offers Settings. Reset writes a timestamped backup next to the file before recreating defaults.
- **Newer schema:** the file was created by a newer extension. Update the extension; reset is disabled so data the current version does not understand is not destroyed.
- **Permission denied:** the host could not read `~/.config/openrouter-manager/routing.json`. Check ownership and that the declared `filesystem` globs were approved at install.

## Prices or performance are N/A

- **Price N/A:** OpenRouter did not publish that price for the endpoint. The extension never estimates it.
- **Latency/throughput N/A:** the endpoint API returns percentiles only to authenticated calls, or there was no recent traffic. Connect the key and refresh; the 30-minute window can still be empty for low-traffic endpoints.
- **Cache write N/A:** OpenRouter usually does not publish cache-write pricing.
- **Provider count N/A:** endpoint data for that model has not loaded yet. Open the model or scroll the page; at most three requests run at once.

## Rate limited (HTTP 429)

Wait, then press **Refresh** again. The extension keeps the last good cache and marks it stale; it does not retry automatically, to avoid making the limit worse.

## The comparison table is cut off

The provider table has 17 columns and scrolls horizontally. The checkbox and provider columns stay pinned; scroll for cache write, image, request, prices, latency, throughput, context, status, updated, and the exclude action. The provider cell also has a quick **Exclude** link.

## A model disappeared

OpenRouter removes and renames models. The extension keeps the stored policy but applies it only to an exact id match. Open the model from a stale link: it says the model is not in the catalog. Remove the policy or recreate it for the new id.

## Reset and recovery

**Settings → Danger zone → Reset configuration**:

1. Writes `routing.backup-<timestamp>.json` beside the config.
2. Recreates the built-in profiles.
3. Removes all model assignments.
4. Leaves the catalog and endpoint caches in place.

To recover an earlier file manually, copy the backup over `routing.json`. The next panel read and the next request will use it.

## Nothing works and I need evidence

Run:

```sh
cd /path/to/openrouter-manager
npm run check
```

Then inspect:

- `~/.config/openrouter-manager/routing.json` — the source of truth.
- `~/.config/openrouter-manager/runtime-status.json` — what OpenCode last loaded and applied.
- `~/.config/openrouter-manager/cache/models.json` — last catalog snapshot.
- OpenCode logs: `~/.local/share/opencode/log/opencode.log` (filter `plugin`).

Never paste an API key into a report. It is not present in any of those files.
