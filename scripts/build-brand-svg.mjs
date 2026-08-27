/**
 * Génère les fichiers SVG de marque à partir de la géométrie de
 * `src/domain/brandMark.ts` — source unique, pour que le dessin rendu dans
 * l'application et celui exporté en icône ne puissent pas diverger.
 *
 *   node scripts/build-brand-svg.mjs
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

// Le module est en TypeScript : on relit les constantes plutôt que d'ajouter
// un transpileur au passage. Elles sont figées par `brandMark.test.ts`.
const src = readFileSync(join(RACINE, 'src/domain/brandMark.ts'), 'utf8');
// Les tracés sont construits à partir des bornes : on résout les mêmes
// constantes ici plutôt que de recopier les coordonnées.
const nombre = nom => {
  const m = new RegExp(`export const ${nom}[^=]*= ([0-9.]+)`).exec(src);
  if (!m) throw new Error(`constante introuvable : ${nom}`);
  return Number(m[1]);
};
const local = nom => {
  const m = new RegExp(`const ${nom} = ([0-9.]+)`).exec(src);
  if (!m) throw new Error(`constante locale introuvable : ${nom}`);
  return Number(m[1]);
};
const couleur = nom => {
  const m = new RegExp(`export const ${nom}[^=]*= '(#[0-9a-fA-F]+)'`).exec(src);
  if (!m) throw new Error(`couleur introuvable : ${nom}`);
  return m[1];
};
const VB = nombre('MARK_VIEWBOX');
const W = nombre('MARK_STROKE');
const MIN = nombre('MARK_MIN');
const MAX = nombre('MARK_MAX');
const BRAS = local('BRAS');
const PIED = local('PIED');

const PATHS = [
  `M${MIN} ${MIN} V${MAX} H${MIN + PIED}`,
  `M${MAX - BRAS} ${MIN} H${MAX} V${MIN + BRAS}`,
  `M${MAX} ${MAX - BRAS} V${MAX} H${MAX - BRAS}`,
];

const ENCRE = couleur('MARK_ON_INK');
const FOND = couleur('MARK_INK');

const traces = (couleur, indent) =>
  PATHS.map(
    d =>
      `${indent}<path d="${d}" fill="none" stroke="${couleur}" stroke-width="${W}" ` +
      `stroke-linecap="round" stroke-linejoin="round"/>`,
  ).join('\n');

/* --- 1. Source de l'icône : aplat plein, 1024 px --- */
// iOS applique lui-même le masque aux coins : le carré doit rester plein.
// La taille est déclarée à 1024 parce que `qlmanage` rend le SVG à SA taille
// intrinsèque, pas à celle demandée en ligne de commande.
writeFileSync(
  join(RACINE, 'assets/brand/logichain-mark.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 ${VB} ${VB}">
  <title>LogiChain</title>
  <rect width="${VB}" height="${VB}" fill="${FOND}"/>
${traces(ENCRE, '  ')}
</svg>
`,
);

/* --- 2. Marque seule, détourée : documentation, supports de soutenance --- */
writeFileSync(
  join(RACINE, 'assets/brand/logichain-symbol.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 ${VB} ${VB}">
  <title>LogiChain — symbole</title>
${traces('currentColor', '  ')}
</svg>
`,
);

/* --- 3. Verrouillage horizontal : symbole + nom --- */
const H = 24;
writeFileSync(
  join(RACINE, 'assets/brand/logichain-lockup.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="180" viewBox="0 0 96 ${H}">
  <title>LogiChain Terrain</title>
  <g fill="none" stroke="${FOND}" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round">
${PATHS.map(d => `    <path d="${d}"/>`).join('\n')}
  </g>
  <text x="28" y="13" font-family="Avenir Next, Helvetica Neue, Arial, sans-serif"
        font-size="9" font-weight="700" letter-spacing="-0.2" fill="${FOND}">LogiChain</text>
  <text x="28" y="20" font-family="Avenir Next, Helvetica Neue, Arial, sans-serif"
        font-size="5.5" font-weight="600" letter-spacing="1.1" fill="#64748b">TERRAIN</text>
</svg>
`,
);

console.log('SVG générés :');
console.log('  assets/brand/logichain-mark.svg    (1024, aplat — source de l’icône)');
console.log('  assets/brand/logichain-symbol.svg  (détouré, currentColor)');
console.log('  assets/brand/logichain-lockup.svg  (symbole + nom)');
