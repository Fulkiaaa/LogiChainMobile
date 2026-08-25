/**
 * Génère une planche de QR codes imprimable pour la démonstration.
 *
 *   npm run qr          → depuis l'API locale
 *   npm run qr:prod     → depuis la production
 *
 * Sortie : `soutenance/qr-codes.html`, autonome (SVG intégrés, aucune requête
 * réseau à l'ouverture) — donc utilisable hors ligne et à l'impression.
 *
 * Les statuts et la compatibilité de chaque mode sont calculés avec la VRAIE
 * fonction `resolveScanAction`, celle que l'application exécute : la planche ne
 * peut pas annoncer un résultat que l'app ne produirait pas.
 */
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import QRCode from 'qrcode';

import {STATUS_LABELS} from '@/config/theme';
import {resolveScanAction, type ScanMode} from '@/domain/scanAction';
import type {ItemStatus} from '@/types/api';

// Déclarés ici et non dans un .d.ts global : voir `scripts/shims.d.ts`.
declare const process: {env: Record<string, string | undefined>; cwd(): string; exitCode?: number};
declare const console: {log(...a: unknown[]): void; error(...a: unknown[]): void};

const BASE = process.env.LOGICHAIN_API ?? 'http://localhost:3000/api/v1';
const EMAIL = process.env.LOGICHAIN_EMAIL ?? 'sofia@logichain.fr';
const PASSWORD = process.env.LOGICHAIN_PASSWORD ?? 'LogiChain2026!';
const SORTIE = resolve(process.cwd(), 'soutenance/qr-codes.html');

const MODES: {key: ScanMode; label: string}[] = [
  {key: 'deploy', label: 'Déploiement'},
  {key: 'transit', label: 'Transit'},
  {key: 'pointage', label: 'Pointage'},
];

interface Equipement {
  qrCode: string;
  label: string;
  status: ItemStatus;
}

async function lireJson<T>(url: string, entetes: Record<string, string>): Promise<T> {
  const res = await fetch(url, {headers: entetes});
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const auth = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: EMAIL, password: PASSWORD}),
  });
  if (!auth.ok) {
    throw new Error(
      auth.status === 429
        ? 'HTTP 429 — limiteur de /auth/login saturé, attendez 5 minutes.'
        : `Connexion refusée : HTTP ${auth.status}. L'API tourne-t-elle sur ${BASE} ?`,
    );
  }
  const {token} = (await auth.json()) as {token: string};
  const entetes = {Authorization: `Bearer ${token}`};

  const evenements = await lireJson<{data?: {id: string; name: string}[]}>(
    `${BASE}/events`,
    entetes,
  );
  const evenement = evenements.data?.[0];
  if (!evenement) {
    throw new Error('Aucun événement en base. Lancez `npm run seed` côté API.');
  }

  /*
   * Même périmètre que `itemsApi.listByEvent` : l'application ne met en cache
   * que les équipements de l'événement assigné. Ceux qui n'en font pas partie
   * sont scannables physiquement mais inconnus de l'app — on les imprime
   * quand même, étiquetés comme tels, pour pouvoir démontrer le rejet.
   */
  const secteur = (
    await lireJson<{data: Equipement[]}>(
      `${BASE}/items?eventId=${encodeURIComponent(evenement.id)}&limit=100`,
      entetes,
    )
  ).data;
  const tous = (await lireJson<{data: Equipement[]}>(`${BASE}/items?limit=100`, entetes)).data;

  const connus = new Set(secteur.map(e => e.qrCode));
  const horsSecteur = tous.filter(e => !connus.has(e.qrCode));

  const tri = (a: Equipement, b: Equipement) => a.qrCode.localeCompare(b.qrCode);
  secteur.sort(tri);
  horsSecteur.sort(tri);

  // ---- Sélection de la planche de démonstration ----
  const premiers = (mode: ScanMode, n: number) =>
    secteur.filter(e => resolveScanAction(mode, e.status).ok).slice(0, n);

  const demo = [
    ...premiers('deploy', 3).map(e => ({e, note: 'Mode Déploiement'})),
    ...premiers('transit', 3)
      // Un équipement déjà retenu pour le Déploiement ferait doublon sur la
      // planche : on prend les suivants.
      .filter(e => !premiers('deploy', 3).some(d => d.qrCode === e.qrCode))
      .slice(0, 3)
      .map(e => ({e, note: 'Mode Transit'})),
    ...horsSecteur.slice(0, 1).map(e => ({e, note: 'DOIT ÊTRE REJETÉ'})),
  ];

  const svg = async (texte: string, taille: number) =>
    QRCode.toString(texte, {
      type: 'svg',
      margin: 1,
      // Correction élevée : la planche sera scannée depuis un écran ou une
      // impression, parfois de biais et avec des reflets.
      errorCorrectionLevel: 'H',
      width: taille,
      color: {dark: '#0f172a', light: '#ffffff'},
    });

  const modesOk = (status: ItemStatus) =>
    MODES.map(m => ({
      label: m.label,
      ok: resolveScanAction(m.key, status).ok,
    }));

  const carte = async (
    e: Equipement,
    taille: number,
    opts: {note?: string; inconnu?: boolean} = {},
  ) => {
    const image = await svg(e.qrCode, taille);
    const modes = opts.inconnu
      ? '<span class="ko">QR inconnu de l’application</span>'
      : modesOk(e.status)
          .map(m => `<span class="${m.ok ? 'ok' : 'ko'}">${m.label}</span>`)
          .join('');
    return `
      <figure class="carte${opts.inconnu ? ' carte--inconnu' : ''}">
        <div class="qr">${image}</div>
        <figcaption>
          ${opts.note ? `<p class="note${opts.inconnu ? ' note--ko' : ''}">${opts.note}</p>` : ''}
          <p class="code">${e.qrCode}</p>
          <p class="nom">${e.label}</p>
          <p class="statut">${STATUS_LABELS[e.status]}</p>
          <p class="modes">${modes}</p>
        </figcaption>
      </figure>`;
  };

  const cartesDemo = (
    await Promise.all(
      demo.map(({e, note}) =>
        carte(e, 220, {note, inconnu: note === 'DOIT ÊTRE REJETÉ'}),
      ),
    )
  ).join('');

  const cartesParc = (await Promise.all(secteur.map(e => carte(e, 130)))).join('');

  const cartesHors = (
    await Promise.all(horsSecteur.map(e => carte(e, 130, {inconnu: true})))
  ).join('');

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR codes — ${evenement.name}</title>
<style>
  /* Fond blanc imposé quel que soit le thème du système : un QR code se lit
     sombre sur clair, l'inverse casse le scan sur beaucoup de lecteurs. */
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px 20px 48px;
    background: #f1f5f9; color: #0f172a;
    font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  header { max-width: 1100px; margin: 0 auto 8px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 {
    max-width: 1100px; margin: 34px auto 4px;
    font-size: 13px; text-transform: uppercase; letter-spacing: .07em; color: #64748b;
  }
  .sous { max-width: 1100px; margin: 0 auto 14px; color: #475569; font-size: 13px; }
  .grille { max-width: 1100px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 14px; }
  .carte {
    margin: 0; padding: 14px; background: #fff;
    border: 1px solid #e2e8f0; border-radius: 12px;
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    break-inside: avoid; page-break-inside: avoid;
  }
  .carte--inconnu { border-color: #fca5a5; background: #fff5f5; }
  .qr { line-height: 0; }
  .qr svg { display: block; height: auto; }
  figcaption { text-align: center; }
  .note {
    margin: 0 0 4px; font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .05em; color: #0369a1;
  }
  .note--ko { color: #b91c1c; }
  .code { margin: 0; font: 700 14px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; }
  .nom { margin: 2px 0 0; font-size: 12px; color: #475569; }
  .statut { margin: 2px 0 0; font-size: 12px; font-weight: 600; }
  .modes { margin: 6px 0 0; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .modes span {
    font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 999px;
  }
  .ok { background: #dcfce7; color: #15803d; }
  .ko { background: #f1f5f9; color: #94a3b8; text-decoration: line-through; }
  .carte--inconnu .ko { background: #fee2e2; color: #b91c1c; text-decoration: none; }
  @media print {
    body { background: #fff; padding: 0; }
    .carte { border-color: #cbd5e1; }
    h2 { break-before: page; page-break-before: always; }
    h2:first-of-type { break-before: auto; page-break-before: auto; }
  }
</style>
</head>
<body>
<header>
  <h1>QR codes — ${evenement.name}</h1>
  <p class="sous">
    Généré depuis ${BASE}. Les statuts et la compatibilité des modes viennent de
    la même fonction que l’application. Scanner depuis l’écran fonctionne ;
    imprimer aussi.
  </p>
</header>

<h2>Planche de démonstration</h2>
<p class="sous">Les codes à utiliser le jour J, un par situation à montrer.</p>
<div class="grille">${cartesDemo}</div>

<h2>Parc du secteur — ${secteur.length} équipements</h2>
<p class="sous">Tous connus de l’application : ils seront reconnus au scan.</p>
<div class="grille">${cartesParc}</div>

<h2>Hors secteur — ${horsSecteur.length} équipements</h2>
<p class="sous">
  Ils existent dans l’API mais ne sont pas synchronisés dans l’application :
  les scanner affiche « QR inconnu ». Utile pour démontrer que la résolution
  est locale.
</p>
<div class="grille">${cartesHors}</div>
</body>
</html>
`;

  writeFileSync(SORTIE, html, 'utf8');

  console.log(`Planche écrite : ${SORTIE}`);
  console.log(`  ${demo.length} codes de démonstration`);
  console.log(`  ${secteur.length} équipements du secteur`);
  console.log(`  ${horsSecteur.length} hors secteur (rejet attendu)`);
  for (const {key, label} of MODES) {
    const n = secteur.filter(e => resolveScanAction(key, e.status).ok).length;
    console.log(`  mode ${label.padEnd(12)} ${n} équipements compatibles`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
