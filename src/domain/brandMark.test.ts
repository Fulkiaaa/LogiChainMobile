import {
  MARK_L,
  MARK_MAX,
  MARK_MIN,
  MARK_PATHS,
  MARK_STROKE,
  MARK_VIEWBOX,
} from '@/domain/brandMark';

/** Extrait tous les nombres d'un tracé SVG, dans l'ordre. */
const nombres = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe('géométrie de la marque', () => {
  test('la marque tient entièrement dans la grille', () => {
    // Un tracé qui déborde serait rogné à l'export en icône.
    MARK_PATHS.forEach(d => {
      nombres(d).forEach(n => {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(MARK_VIEWBOX);
      });
    });
  });

  test('la marque garde une marge suffisante pour l’épaisseur du trait', () => {
    // Un trait de 2,5 déborde de 1,25 de part et d'autre de son axe : sans
    // marge, les extrémités seraient coupées par le bord de l'icône.
    const marge = MARK_STROKE / 2;
    MARK_PATHS.forEach(d => {
      nombres(d).forEach(n => {
        expect(n).toBeGreaterThanOrEqual(marge);
        expect(n).toBeLessThanOrEqual(MARK_VIEWBOX - marge);
      });
    });
  });

  test('le L se lit comme une lettre, pas comme une équerre', () => {
    // « M4 4 V20 H10 » : hampe de 16, pied de 6.
    const [x, yHaut, yBas, xFin] = nombres(MARK_L) as [number, number, number, number];
    const hampe = yBas - yHaut;
    const pied = xFin - x;
    expect(hampe).toBeGreaterThan(pied * 1.8);
  });

  test('les trois tracés sont distincts', () => {
    expect(new Set(MARK_PATHS).size).toBe(MARK_PATHS.length);
  });

  test('la composition s’appuie exactement sur les bornes du carré utile', () => {
    // Un cadre de visée qui n'est pas carré se lit comme un défaut, pas comme
    // une intention. Les bornes sont exportées, donc le test suit un
    // ajustement de la marque au lieu de le bloquer.
    const tous = MARK_PATHS.flatMap(nombres);
    expect(Math.min(...tous)).toBe(MARK_MIN);
    expect(Math.max(...tous)).toBe(MARK_MAX);
  });

  test('le centre reste dégagé', () => {
    /*
     * Le pied du L doit s'arrêter avant l'équerre de droite. Sans ce vide, les
     * trois formes se rejoignent en une masse illisible à 60 px — la taille
     * réelle d'une icône iOS, et le seul format qui compte vraiment.
     */
    const finDuPied = nombres(MARK_L)[3]!;
    const debutEquerreBasse = nombres(MARK_PATHS[2]!).at(-1)!;
    expect(debutEquerreBasse - finDuPied).toBeGreaterThanOrEqual(2 * MARK_STROKE);
  });

  test('l’épaisseur est celle des icônes de l’application', () => {
    // `lucide-react-native` est employé partout avec strokeWidth={2.5}.
    expect(MARK_STROKE).toBe(2.5);
  });
});
