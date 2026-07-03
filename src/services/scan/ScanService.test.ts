import { createScanDeduper } from '@/services/scan/ScanService';
test('même code < fenêtre = doublon', () => {
  const d = createScanDeduper(1500);
  expect(d.isDuplicate('QR1', 1000)).toBe(false);
  expect(d.isDuplicate('QR1', 1500)).toBe(true);
  expect(d.isDuplicate('QR1', 3000)).toBe(false);
});
