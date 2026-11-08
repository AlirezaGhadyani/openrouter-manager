# Security policy

## Supported versions

The latest release on `main` receives fixes.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private
vulnerability reporting: open the **Security** tab of this repository and choose
**Report a vulnerability**. Include the extension version, OpenChamber and OpenCode
versions, and reproduction steps. Never include an API key.

## Security model

- The OpenRouter API key is an OpenChamber integration credential. The panel calls
  `host.request` and OpenChamber adds the token; the key never reaches the page,
  the bundled plugin, logs, the config file, or error messages.
- The panel asks for `filesystem` access only to `~/.config/openrouter-manager/*`
  and `~/.config/openrouter-manager/**`.
- The bundled OpenCode plugin runs with the same access as the user's OpenCode. It
  reads only the extension config and writes only its status file.
- The plugin rewrites requests only to `https://openrouter.ai`; non-POST requests,
  non-JSON bodies, and bodies over 16 MiB pass through untouched.
- Routing failures are contained: an invalid or missing config leaves the request
  unchanged rather than failing the model call.

Reports about escaping these boundaries, exposing the token, or rewriting traffic
outside the declared origin are in scope.
