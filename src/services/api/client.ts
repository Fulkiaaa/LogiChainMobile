type Tokens = { token: string; refreshToken: string };
export interface ApiDeps {
  fetchImpl: typeof fetch; baseUrl: string;
  tokenStore: { get(): Promise<Tokens|null>; set(t: Tokens): Promise<void>; clear(): Promise<void> };
  refreshFn: (refreshToken: string) => Promise<Tokens>;
}
export function createApiClient(deps: ApiDeps) {
  async function apiFetch<T=unknown>(path: string, opts: { method?: string; body?: unknown; auth?: boolean } = {}) {
    const doCall = async (token?: string) => deps.fetchImpl(`${deps.baseUrl}${path}`, {
      method: opts.method ?? 'GET',
      headers: { 'Content-Type':'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const tokens = opts.auth ? await deps.tokenStore.get() : null;
    let res = await doCall(tokens?.token);
    if (res.status === 401 && tokens?.refreshToken) {
      const fresh = await deps.refreshFn(tokens.refreshToken);
      await deps.tokenStore.set(fresh);
      res = await doCall(fresh.token);
    }
    const data = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, data };
  }
  return { apiFetch };
}
