# Contributing

Thanks for taking the time to improve OpenRouter Manager.

## Development

```sh
npm ci
npm run check   # typecheck + tests + build + package checks
```

`npm run check` is the same command CI runs. A pull request that changes routing
behavior should include a test and an update to `README.md` or the relevant file
in `docs/`.

## Project rules

- Keep changes focused. One concern per pull request.
- Only documented OpenRouter `provider` fields may be emitted. Do not add guessed
  or undocumented fields.
- A routing feature must never break a model call. Missing files, invalid JSON,
  unknown models, and unexpected request shapes pass through unchanged.
- The API key stays in OpenChamber. It must never enter the panel, the plugin,
  logs, the config file, or error messages.
- `plugin/index.js` must keep no static imports and no `require()`; OpenCode loads
  it with a bare `import()` from the extension folder.
- Commit the rebuilt `panel/main.js`, `panel/style.css`, and `plugin/index.js`
  with source changes. OpenChamber never builds at install time.
- Do not commit secrets, API keys, or `node_modules`.

## Shipping an update

1. Change the source.
2. Bump `version` in `package.json` and `src/shared/version.ts`.
3. Run `npm run check`.
4. Commit the source and the rebuilt files.
5. Push. OpenChamber checks Git installs for updates in Settings → Extensions.

## Reporting a bug

Open an issue with:

- Extension, OpenChamber, and OpenCode versions.
- The model id and routing key shown in **Settings → Configuration sync → Runtime**.
- Expected result and actual result.
- The contents of `routing.json` and `runtime-status.json` if relevant. These
  files contain no secrets, but review them before posting.

Never include an API key.
