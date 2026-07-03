import { createApiClient } from '@/services/api/client';
test('401 déclenche un refresh puis rejoue', async () => {
  const calls: string[] = [];
  const fetchImpl = jest.fn()
    .mockResolvedValueOnce({ status: 401, json: async () => ({}) })
    .mockResolvedValueOnce({ status: 200, json: async () => ({ ok: true }) });
  const tokenStore = {
    get: async () => ({ token:'old', refreshToken:'r' }),
    set: jest.fn(async () => {}), clear: jest.fn(async () => {}),
  };
  const refreshFn = jest.fn(async () => { calls.push('refresh'); return { token:'new', refreshToken:'r2' }; });
  const api = createApiClient({ fetchImpl: fetchImpl as any, tokenStore, refreshFn, baseUrl: 'http://x' });
  const res = await api.apiFetch('/me', { auth: true });
  expect(calls).toContain('refresh');
  expect(res.status).toBe(200);
});
