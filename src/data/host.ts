/** The subset of the OpenChamber host bridge the data layer needs. */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpResult {
  status: number;
  body: string;
}

export interface PanelHost {
  request(request: {
    method: HttpMethod;
    path: string;
    query?: Record<string, string>;
    body?: string;
  }): Promise<HttpResult>;
  readFile(path: string): Promise<{ content: string }>;
  writeFile(path: string, content: string): Promise<{ written: true }>;
  stat(path: string): Promise<{ kind: string; size: number; mtime: number }>;
}

export function hostErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error';
}
