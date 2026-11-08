import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const shared = {
  bundle: true,
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'info',
  target: ['es2022'],
};

// The panel: one classic IIFE script, because a sandboxed page loads no modules.
await build({
  ...shared,
  entryPoints: ['src/panel/main.ts'],
  outfile: 'panel/main.js',
  format: 'iife',
  platform: 'browser',
  target: ['chrome120'],
});

// The OpenCode plugin: one ESM file with no import statements, as OpenChamber requires.
// Node built-ins are reached through process.getBuiltinModule at runtime, never imported.
await build({
  ...shared,
  entryPoints: ['src/plugin/main.ts'],
  outfile: 'plugin/index.js',
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  external: [],
});

await mkdir('panel', { recursive: true });
await copyFile('src/panel/style.css', 'panel/style.css');
console.log('built panel/main.js, panel/style.css, plugin/index.js');
