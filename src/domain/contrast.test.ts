import {BLACK, WHITE, contrastRatio, flatten, parseHex} from '@/domain/contrast';
import {OVERLAY} from '@/config/theme';

const hex = (h: string) => {
  const c = parseHex(h);
  if (!c) {
    throw new Error(`Couleur illisible : ${h}`);
  }
  return c;
};

describe('outillage', () => {
  test('noir sur blanc donne le contraste maximal', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 1);
  });

  test('une couleur avec elle-même ne contraste pas', () => {
    expect(contrastRatio(hex('#38bdf8'), hex('#38bdf8'))).toBeCloseTo(1, 5);
  });

  test('un voile à 70 % assombrit fortement un fond blanc', () => {
    const voile = flatten(hex('#0f172a'), 0.7, WHITE);
    expect(voile.r).toBeLessThan(100);
  });

  test('une entrée illisible ne lève pas', () => {
    expect(parseHex('bleu')).toBeNull();
  });
});

describe('lisibilité des contrôles posés sur la caméra', () => {
  // Le voile de l'overlay, composé sur les deux extrêmes que l'objectif peut
  // renvoyer : un hangar sans lumière, un mur blanc en plein soleil.
  const fondSombre = flatten(hex(OVERLAY.scrimColor), OVERLAY.scrimAlpha, BLACK);
  const fondClair = flatten(hex(OVERLAY.scrimColor), OVERLAY.scrimAlpha, WHITE);

  const textes: [string, string][] = [
    ['texte principal', OVERLAY.text],
    ['texte atténué', OVERLAY.textMuted],
    ['avertissement', OVERLAY.warning],
    ['succès', OVERLAY.success],
    ['échec', OVERLAY.danger],
  ];

  test.each(textes)('%s reste lisible sur un fond noir', (_nom, couleur) => {
    expect(contrastRatio(hex(couleur), fondSombre)).toBeGreaterThanOrEqual(4.5);
  });

  test.each(textes)('%s reste lisible sur un fond blanc', (_nom, couleur) => {
    expect(contrastRatio(hex(couleur), fondClair)).toBeGreaterThanOrEqual(4.5);
  });

  test('le mode sélectionné contraste avec son propre fond plein', () => {
    expect(contrastRatio(hex(OVERLAY.onPrimary), hex(OVERLAY.primary))).toBeGreaterThanOrEqual(4.5);
  });
});
