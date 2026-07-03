import { geoPointSchema, anomalyInputSchema } from '@/schemas/item.schema';
test('geoPoint valide', () => {
  expect(geoPointSchema.safeParse({ type: 'Point', coordinates: [2.3, 48.8] }).success).toBe(true);
});
test('anomalie exige une note non vide', () => {
  expect(anomalyInputSchema.safeParse({ location: { type:'Point', coordinates:[2,48] }, note: '' }).success).toBe(false);
});
