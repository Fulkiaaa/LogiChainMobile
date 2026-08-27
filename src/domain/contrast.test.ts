import {BLACK, WHITE, contrastRatio, flatten, parseHex} from '@/domain/contrast';
import {OVERLAY, PALETTES, STATUS_COLORS_BY_SCHEME} from '@/config/theme';

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

/*
 * Les palettes principales n'étaient couvertes par aucun test : seul l'overlay
 * caméra l'était. C'est ce qui a laissé s'installer douze paires sous le seuil,
 * dont la couleur primaire du thème clair — celle de tous les liens et de tous
 * les états actifs. Le filet existait, il était tendu au mauvais endroit.
 *
 * Seuils WCAG 2.1 : 4,5:1 pour du texte courant (1.4.3), 3:1 pour la limite
 * visible d'un contrôle (1.4.11).
 */
describe('lisibilité des palettes principales', () => {
  const SCHEMES = ['dark', 'light'] as const;

  /** Couleurs employées comme texte, et fonds sur lesquels elles peuvent se poser. */
  const TEXTES = [
    'text',
    'textMuted',
    'primary',
    'success',
    'danger',
    'warning',
  ] as const;
  const FONDS = ['bg', 'surface'] as const;

  const paires = SCHEMES.flatMap(scheme =>
    TEXTES.flatMap(texte => FONDS.map(fond => [scheme, texte, fond] as const)),
  );

  test.each(paires)('%s : %s reste lisible sur %s', (scheme, texte, fond) => {
    const p = PALETTES[scheme];
    expect(contrastRatio(hex(p[texte]), hex(p[fond]))).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  /*
   * `surfaceAlt` ne porte plus que du texte plein (la pastille numérotée des
   * étapes de tournée). Les teintes vives en ont été retirées : elles y
   * tombaient sous le seuil, si bien que sélectionner un filtre rendait son
   * libellé MOINS lisible qu'au repos.
   */
  test.each(SCHEMES)(
    '%s : le texte plein reste lisible sur surfaceAlt',
    scheme => {
      const p = PALETTES[scheme];
      expect(
        contrastRatio(hex(p.text), hex(p.surfaceAlt)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  test.each(SCHEMES)(
    '%s : un bouton plein contraste avec son propre fond',
    scheme => {
      const p = PALETTES[scheme];
      expect(
        contrastRatio(hex(p.onPrimary), hex(p.primary)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  test.each(SCHEMES)(
    '%s : un bouton destructif contraste avec son propre fond',
    scheme => {
      // « Déclarer perdu » pose onPrimary sur danger, pas sur primary.
      const p = PALETTES[scheme];
      expect(
        contrastRatio(hex(p.onPrimary), hex(p.danger)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  test.each(SCHEMES)('%s : la bordure d’un contrôle est visible', scheme => {
    // 1.4.11 : la limite d'un champ de saisie est une information, pas un ornement.
    const p = PALETTES[scheme];
    expect(
      contrastRatio(hex(p.borderStrong), hex(p.bg)),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('lisibilité des couleurs de statut', () => {
  const SCHEMES = ['dark', 'light'] as const;
  const STATUTS = [
    'in_stock',
    'allocated',
    'in_transit',
    'deployed',
    'in_maintenance',
    'lost',
  ] as const;

  const paires = SCHEMES.flatMap(s => STATUTS.map(st => [s, st] as const));

  test.each(paires)(
    '%s : le statut %s se lit sur une carte',
    (scheme, statut) => {
      const fond = PALETTES[scheme].surface;
      expect(
        contrastRatio(hex(STATUS_COLORS_BY_SCHEME[scheme][statut]), hex(fond)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});
