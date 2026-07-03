import { pickCachedFields, CACHE_MANIFEST } from '@/data/cacheManifest';

test('item ne cache pas history/prix', () => {
  const cached = pickCachedFields('item', { id:'1', qrCode:'Q', history:[1], purchasePriceEur: 9 } as any);
  expect(cached).toHaveProperty('qrCode');
  expect(cached).not.toHaveProperty('history');
  expect(cached).not.toHaveProperty('purchasePriceEur');
});

test('outbox est vidée après sync', () => {
  expect(CACHE_MANIFEST.outbox.clearOnSync).toBe(true);
  expect(CACHE_MANIFEST.item.clearOnSync).toBe(false);
});
