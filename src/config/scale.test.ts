import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { SPACE, TYPE_SIZES } from '@/config/theme';

/**
 * Garde-fou d'échelle.
 *
 * Définir `TYPE` et `SPACE` dans `theme.ts` ne sert à rien si un écran peut
 * continuer à écrire `fontSize: 13.5` sans que personne ne s'en aperçoive.
 * Ce test relit le code source et refuse toute valeur hors échelle — c'est ce
 * qui transforme une convention en règle.
 *
 * Il tolère explicitement l'échappatoire : voir ARDOISE ci-dessous.
 */
const RACINE = join(__dirname, '..');

/** Fichiers où une valeur libre reste légitime, avec la raison. */
const ARDOISE: Record<string, string> = {
  'components/ModeSelector.tsx':
    'contrôles posés sur l’aperçu caméra — dimensionnés pour un fond inconnu',
  'screens/ScanScreen.tsx': 'calque caméra — même raison',
};

function fichiersSource(dir: string): string[] {
  return readdirSync(dir).flatMap(nom => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) {
      return fichiersSource(chemin);
    }
    const estSource = /\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom);
    return estSource ? [chemin] : [];
  });
}

const SOURCES = fichiersSource(RACINE)
  .map(chemin => ({
    relatif: chemin.slice(RACINE.length + 1),
    contenu: readFileSync(chemin, 'utf8'),
  }))
  // `theme.ts` DÉFINIT les échelles : il est normal qu'il porte les nombres.
  .filter(f => f.relatif !== 'config/theme.ts' && !ARDOISE[f.relatif]);

/** Relève `fontSize: 13.5` et consorts, en ignorant `fontSize: TYPE.body.fontSize`. */
function tailles(contenu: string): number[] {
  return [...contenu.matchAll(/fontSize:\s*([0-9]+(?:\.[0-9]+)?)/g)].map(m =>
    Number(m[1]),
  );
}

function espacements(contenu: string): number[] {
  return [
    ...contenu.matchAll(
      /(?:padding|margin|gap)[A-Za-z]*:\s*(-?[0-9]+(?:\.[0-9]+)?)/g,
    ),
  ].map(m => Number(m[1]));
}

describe('échelle typographique', () => {
  test.each(SOURCES.map(f => [f.relatif, f.contenu] as const))(
    '%s n’emploie que des tailles de l’échelle',
    (_nom, contenu) => {
      const horsEchelle = tailles(contenu).filter(t => !TYPE_SIZES.includes(t));
      expect(horsEchelle).toEqual([]);
    },
  );

  test('l’échelle progresse d’au moins 1,15 entre deux échelons', () => {
    // Cinq tailles séparées d'un facteur 1,08 ne créent aucune hiérarchie :
    // c'est précisément ce que le code faisait avant.
    const croissant = [...TYPE_SIZES].sort((a, b) => a - b);
    croissant.slice(1).forEach((taille, i) => {
      expect(taille / croissant[i]!).toBeGreaterThanOrEqual(1.15);
    });
  });
});

describe('échelle d’espacement', () => {
  const AUTORISES = new Set<number>([0, ...Object.values(SPACE)]);

  test.each(SOURCES.map(f => [f.relatif, f.contenu] as const))(
    '%s n’emploie que des espacements de la grille de 4 pt',
    (_nom, contenu) => {
      const horsGrille = espacements(contenu).filter(e => !AUTORISES.has(e));
      expect(horsGrille).toEqual([]);
    },
  );
});
