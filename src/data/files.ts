import type { PanelHost } from './host.ts';
import { hostErrorCode } from './host.ts';

/** Read a UTF-8 file, or `null` when it does not exist. Other failures surface. */
export async function readText(host: PanelHost, path: string): Promise<string | null> {
  try {
    const result = await host.readFile(path);
    return result.content;
  } catch (error) {
    const code = hostErrorCode(error);
    if (code === 'NOT_FOUND') return null;
    throw error;
  }
}

export async function writeText(host: PanelHost, path: string, content: string): Promise<void> {
  await host.writeFile(path, content);
}

export async function statText(
  host: PanelHost,
  path: string,
): Promise<{ kind: string; size: number; mtime: number } | null> {
  try {
    return await host.stat(path);
  } catch (error) {
    if (hostErrorCode(error) === 'NOT_FOUND') return null;
    throw error;
  }
}

export async function readJson<T>(host: PanelHost, path: string): Promise<T | null> {
  const text = await readText(host, path);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
