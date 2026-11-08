import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseManifestJson } from '@openchamber/sdk/schemas';

const root = process.cwd();
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}
function warn(message) {
  warnings.push(message);
}
function mustExist(relative) {
  const path = join(root, relative);
  if (!existsSync(path)) {
    fail(`Missing file: ${relative}`);
    return null;
  }
  return path;
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const parsed = parseManifestJson(JSON.stringify(pkg));
if (!parsed.ok) {
  fail(`Manifest rejected: ${parsed.code} — ${parsed.message}`);
} else {
  const manifest = parsed.manifest;
  if (manifest.contributes.panel.entry) mustExist(manifest.contributes.panel.entry);
  const icon = manifest.contributes.panel.icon;
  if (icon && icon.endsWith('.svg')) mustExist(icon);
  mustExist('panel/main.js');
  mustExist('panel/style.css');
  if (manifest.contributes.opencodePlugin) {
    const folder = manifest.contributes.opencodePlugin;
    mustExist(folder);
    const entry = join(root, folder, 'index.js');
    if (!existsSync(entry)) fail(`Missing plugin entry: ${folder}/index.js`);
  }
}

const versionSource = readFileSync(join(root, 'src/shared/version.ts'), 'utf8');
const versionMatch = versionSource.match(/EXTENSION_VERSION\s*=\s*'([^']+)'/);
if (!versionMatch) fail('src/shared/version.ts has no EXTENSION_VERSION');
else if (versionMatch[1] !== pkg.version) fail(`Version mismatch: package.json ${pkg.version}, source ${versionMatch[1]}`);

const pluginPath = join(root, 'plugin/index.js');
if (existsSync(pluginPath)) {
  const plugin = readFileSync(pluginPath, 'utf8');
  if (/^\s*import\s/m.test(plugin)) fail('plugin/index.js contains a static import; OpenChamber requires none.');
  if (/\brequire\s*\(/.test(plugin)) fail('plugin/index.js calls require(); OpenChamber requires no imports.');
  if (!/export\s*\{[^}]*default/.test(plugin) && !/export default/.test(plugin)) {
    fail('plugin/index.js has no default export.');
  }
  if (!/setup\s*:/.test(plugin) && !/async setup/.test(plugin)) fail('plugin/index.js has no setup entry.');
  if (!/http\.request/.test(plugin)) fail('plugin/index.js does not register the http.request hook.');
  if (statSync(pluginPath).size > 300_000) warn('plugin/index.js is larger than expected.');
} else {
  fail('Missing built plugin: plugin/index.js (run npm run build)');
}

const panelPath = join(root, 'panel/main.js');
if (existsSync(panelPath)) {
  const panel = readFileSync(panelPath, 'utf8');
  if (panel.includes('sourceMappingURL')) warn('panel/main.js has a source map comment.');
  if (!panel.includes('connectHost')) fail('panel/main.js does not use the OpenChamber host bridge.');
  if (statSync(panelPath).size > 1_500_000) warn('panel/main.js is larger than expected.');
} else {
  fail('Missing built panel: panel/main.js (run npm run build)');
}

const pluginPkgPath = join(root, 'plugin/package.json');
if (existsSync(pluginPkgPath)) {
  const pluginPkg = JSON.parse(readFileSync(pluginPkgPath, 'utf8'));
  const exported = pluginPkg.exports?.['.'];
  if (!exported) fail('plugin/package.json exports no "." entry.');
  else if (!existsSync(join(root, 'plugin', exported))) fail(`plugin/package.json exports missing file: ${exported}`);
}

if (pkg.dependencies?.['@openchamber/sdk'] !== '2.7.0') {
  fail('Pin @openchamber/sdk to 2.7.0 so the package matches the running host.');
}
if (pkg.openchamber?.engines?.openchamber !== '>=2.7.0') {
  warn('engines.openchamber is not >=2.7.0. Required features (opencodePlugin) need that floor.');
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`error: ${failure}`);
  process.exit(1);
}
console.log(`package ready: ${parsed.ok ? parsed.manifest.contributes.panel.id : 'unknown'} ${pkg.version}`);
