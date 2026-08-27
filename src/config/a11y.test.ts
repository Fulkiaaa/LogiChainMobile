import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Garde-fou d'accessibilité.
 *
 * Vingt et une zones tactiles sur trente-quatre ne déclaraient aucun rôle :
 * VoiceOver les annonçait comme du texte ordinaire, et le rotor ne les listait
 * pas parmi les contrôles. La connaissance était pourtant présente — trois
 * composants le faisaient parfaitement. C'est exactement le genre d'oubli
 * qu'un test rattrape mieux qu'une relecture.
 *
 * Un `Pressable` doit donc porter soit `accessibilityRole`, soit
 * `accessible={false}` s'il ne s'agit que d'un capteur de geste (le fond d'une
 * modale, par exemple).
 */
const RACINE = join(__dirname, '..');

function fichiersTsx(dir: string): string[] {
  return readdirSync(dir).flatMap(nom => {
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) {
      return fichiersTsx(chemin);
    }
    return /\.tsx$/.test(nom) && !/\.test\.tsx$/.test(nom) ? [chemin] : [];
  });
}

/**
 * Fin de la balise ouvrante commençant à `depuis`, en ignorant les `>` situés
 * dans une expression JSX (`{() => ...}`) ou une chaîne.
 */
function finDeBalise(source: string, depuis: number): number {
  let profondeur = 0;
  for (let i = depuis; i < source.length; i++) {
    const ch = source[i]!;
    if (ch === '{') {
      profondeur++;
    } else if (ch === '}') {
      profondeur--;
    } else if ((ch === '"' || ch === "'") && profondeur === 0) {
      const fermante = source.indexOf(ch, i + 1);
      if (fermante === -1) {
        return -1;
      }
      i = fermante;
    } else if (ch === '>' && profondeur === 0 && source[i - 1] !== '=') {
      return i;
    }
  }
  return -1;
}

/** Numéro de ligne (1-indexé) d'un décalage dans le fichier. */
const ligneDe = (source: string, index: number) =>
  source.slice(0, index).split('\n').length;

function pressablesSansRole(source: string): number[] {
  const fautifs: number[] = [];
  for (const m of source.matchAll(/<Pressable\b/g)) {
    const debut = m.index! + m[0].length;
    const fin = finDeBalise(source, debut);
    if (fin === -1) {
      continue;
    }
    const attributs = source.slice(debut, fin);
    const declare =
      attributs.includes('accessibilityRole') ||
      attributs.includes('accessible={false}');
    if (!declare) {
      fautifs.push(ligneDe(source, m.index!));
    }
  }
  return fautifs;
}

const SOURCES = fichiersTsx(RACINE).map(chemin => ({
  relatif: chemin.slice(RACINE.length + 1),
  contenu: readFileSync(chemin, 'utf8'),
}));

describe('zones tactiles annoncées aux lecteurs d’écran', () => {
  test('le corpus analysé n’est pas vide', () => {
    // Sécurité : un test qui ne lit aucun fichier passerait toujours.
    expect(SOURCES.length).toBeGreaterThan(5);
    expect(SOURCES.some(f => f.contenu.includes('<Pressable'))).toBe(true);
  });

  test.each(SOURCES.map(f => [f.relatif, f.contenu] as const))(
    '%s : chaque Pressable déclare son rôle',
    (_nom, contenu) => {
      expect(pressablesSansRole(contenu)).toEqual([]);
    },
  );
});
