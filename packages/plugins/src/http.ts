/** Throw on HTTP failures so an external error cannot look like successful work. */
export async function fetchJson(url: string | URL, options: RequestInit = {}) {
  const response = await fetch(url, { ...options, signal: options.signal ?? AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`El servicio respondió HTTP ${response.status}`);
  return response;
}
