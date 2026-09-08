import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { TOUCH_MIN } from '@/config/theme';

/**
 * Garde-fou de dimension tactile.
 *
 * Le retour des agents de terrain était sans détour : « il faut de gros
 * boutons pour nos gros doigts ». `TOUCH_MIN` existait pourtant déjà — mais
 * il n'était branché que sur sept surfaces sur trente-cinq. Partout ailleurs
 * la hauteur d'un bouton était un accident de `paddingVertical` : elle tombait
 * juste, ou pas, selon l'écran.
 *
 * Ce test relit le code source et exige que chaque `Pressable` déclare
 * `minHeight: TOUCH_MIN`. C'est ce qui transforme le retour terrain en règle :
 * la prochaine zone tactile ajoutée à l'application ne pourra pas être trop
 * petite sans que la suite ne le dise.
 *
 * Échappatoire unique : un `Pressable` qui n'est qu'un capteur de geste — le
 * fond d'une modale, l'intérieur d'une feuille qui absorbe le tap pour ne pas
 * la fermer — n'est pas un bouton et n'a pas de cible à dimensionner. Il se
 * signale par `accessible={false}`, exactement comme dans `a11y.test.ts`.
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

/**
 * Nom du style porté par la balise : `style={styles.X}` comme
 * `style={[styles.X, condition && styles.Y]}`. Seul le premier compte — c'est
 * lui qui pose la géométrie, les suivants ne font que la teinter.
 */
function nomDeStyle(attributs: string): string | null {
  const m = attributs.match(/style=\{\[?\s*styles\.([A-Za-z0-9_]+)/);
  return m ? m[1]! : null;
}

/**
 * Corps de l'entrée `nom: { ... }` du `StyleSheet.create` du fichier, braces
 * équilibrées pour ne pas s'arrêter au premier `}` d'un style imbriqué.
 */
function corpsDuStyle(source: string, nom: string): string | null {
  const debut = source.search(
    new RegExp(`(?:^|[^A-Za-z0-9_])${nom}:\\s*\\{`, 'm'),
  );
  if (debut === -1) {
    return null;
  }
  const ouvrante = source.indexOf('{', debut);
  let profondeur = 0;
  for (let i = ouvrante; i < source.length; i++) {
    if (source[i] === '{') {
      profondeur++;
    } else if (source[i] === '}') {
      profondeur--;
      if (profondeur === 0) {
        return source.slice(ouvrante, i + 1);
      }
    }
  }
  return null;
}

/** Décrit chaque Pressable dont la cible n'est pas garantie, avec sa raison. */
function ciblesTropPetites(source: string): string[] {
  const fautifs: string[] = [];
  for (const m of source.matchAll(/<Pressable\b/g)) {
    const debut = m.index! + m[0].length;
    const fin = finDeBalise(source, debut);
    if (fin === -1) {
      continue;
    }
    const attributs = source.slice(debut, fin);
    const ligne = ligneDe(source, m.index!);
    if (attributs.includes('accessible={false}')) {
      continue;
    }
    const nom = nomDeStyle(attributs);
    if (nom === null) {
      fautifs.push(`ligne ${ligne} : style anonyme, dimension invérifiable`);
      continue;
    }
    const corps = corpsDuStyle(source, nom);
    if (corps === null) {
      fautifs.push(`ligne ${ligne} : style « ${nom} » introuvable`);
      continue;
    }
    if (!/minHeight:\s*TOUCH_MIN/.test(corps)) {
      fautifs.push(`ligne ${ligne} : « ${nom} » ne déclare pas minHeight: TOUCH_MIN`);
    }
  }
  return fautifs;
}

const SOURCES = fichiersTsx(RACINE).map(chemin => ({
  relatif: chemin.slice(RACINE.length + 1),
  contenu: readFileSync(chemin, 'utf8'),
}));

describe('dimension des zones tactiles', () => {
  test('la cible minimale tient compte des gants', () => {
    // 44 pt (≈ 7 mm) est le plancher d'un pouce nu, assis. Un agent debout,
    // ganté, en mouvement, demande ~9 mm — c'est ce que mesure 56 pt.
    expect(TOUCH_MIN).toBeGreaterThanOrEqual(56);
  });

  test('le corpus analysé n’est pas vide', () => {
    // Sécurité : un test qui ne lit aucun fichier passerait toujours.
    expect(SOURCES.length).toBeGreaterThan(5);
    expect(SOURCES.some(f => f.contenu.includes('<Pressable'))).toBe(true);
  });

  test.each(SOURCES.map(f => [f.relatif, f.contenu] as const))(
    '%s : chaque Pressable garantit sa hauteur de cible',
    (_nom, contenu) => {
      expect(ciblesTropPetites(contenu)).toEqual([]);
    },
  );
});
