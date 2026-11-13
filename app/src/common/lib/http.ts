export const DEFAULT_TIMEOUT_MS = 20_000;

export function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

export async function fetchJSON<T>(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const res = await fetchWithTimeout(url, {}, timeoutMs);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText || "error"} for ${url}`);
  return (await res.json()) as T;
}
