import {ENV} from '@/config/env';

test('base URL pointe vers l’API LogiChain', () => {
  expect(ENV.API_BASE_URL).toBe('https://api-logichain.fulkia.fr/api/v1');
  expect(ENV.SCAN_DEDUP_MS).toBeGreaterThan(0);
});
