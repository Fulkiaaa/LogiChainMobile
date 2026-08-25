import {API_ENDPOINTS, ENV} from '@/config/env';

test('base URL pointe vers une API LogiChain connue', () => {
  // Verrou volontairement souple : basculer LOCAL ⇄ PROD est un geste normal
  // de démo. Ce qu'on empêche, c'est une URL inventée ou un chemin tronqué.
  expect(Object.values(API_ENDPOINTS)).toContain(ENV.API_BASE_URL);
  expect(ENV.API_BASE_URL.endsWith('/api/v1')).toBe(true);
  expect(ENV.SCAN_DEDUP_MS).toBeGreaterThan(0);
});
