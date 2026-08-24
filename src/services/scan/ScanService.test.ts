import { createScanDeduper } from '@/services/scan/ScanService';
test('même code < fenêtre = doublon', () => {
  const d = createScanDeduper(1500);
  expect(d.isDuplicate('QR1', 1000)).toBe(false);
  expect(d.isDuplicate('QR1', 1500)).toBe(true);
  expect(d.isDuplicate('QR1', 3000)).toBe(false);
});

test('un code visé en continu n’est accepté QU’UNE fois (pas de rescan en boucle)', () => {
  const d = createScanDeduper(1500);
  let accepted = 0;
  // La caméra voit le même QR toutes les 300 ms pendant 6 secondes.
  for (let t = 0; t <= 6000; t += 300) {
    if (!d.isDuplicate('QR1', t)) accepted++;
  }
  expect(accepted).toBe(1);
});

test('un code re-présenté après être sorti du champ est réaccepté', () => {
  const d = createScanDeduper(1500);
  expect(d.isDuplicate('QR1', 0)).toBe(false);
  // Le QR quitte le champ : plus aucune vue pendant 2 s.
  expect(d.isDuplicate('QR1', 2000)).toBe(false);
});

test('deux codes différents ne se bloquent pas mutuellement', () => {
  const d = createScanDeduper(1500);
  expect(d.isDuplicate('QR1', 0)).toBe(false);
  expect(d.isDuplicate('QR2', 100)).toBe(false);
  expect(d.isDuplicate('QR3', 200)).toBe(false);
});
