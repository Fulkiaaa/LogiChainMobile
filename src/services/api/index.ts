import {ENV} from '@/config/env';

import {createApiClient} from './client';
import {tokenStore, type Tokens} from './tokenStore';

async function refreshFn(refreshToken: string): Promise<Tokens> {
  const res = await fetch(`${ENV.API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({refreshToken}),
  });
  const d = (await res.json()) as {token: string; refreshToken: string};
  return {token: d.token, refreshToken: d.refreshToken};
}

/** Client API réel (production) : fetch natif + Keychain + refresh JWT. */
export const api = createApiClient({
  fetchImpl: fetch,
  baseUrl: ENV.API_BASE_URL,
  tokenStore,
  refreshFn,
});
