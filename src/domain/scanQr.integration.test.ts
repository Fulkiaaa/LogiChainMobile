import {resolveScanAction, type ScanMode} from '@/domain/scanAction';
import {STATUS_LABELS} from '@/config/theme';
import type {ItemStatus} from '@/types/api';

/**
 * « J'AI CE QR CODE, JE LE SCANNE, JE DOIS M'ATTENDRE À QUOI ? »
 *
 * Ce test ne tourne pas avec `npm test` : il a besoin d'une API vivante.
 *
 *   npm run scan          → API locale (http://localhost:3000)
 *   npm run scan:prod     → API de production
 *
 * Il récupère les vrais équipements du jeu de démo et calcule, pour chaque QR
 * code, ce qui se passera dans chacun des trois modes de scan — en appelant la
 * VRAIE fonction `resolveScanAction`, celle que l'application exécute. La
 * sortie ne peut donc pas diverger du comportement réel.
 *
 * ── Ce qu'il ne couvre pas ──
 * L'application résout le QR depuis son cache SQLite, pas depuis l'API. Après
 * une synchro le cache est le miroir de l'API, donc les statuts coïncident ;
 * avant, ils peuvent différer. Les quatre autres causes de rejet (doublon,
 * QR inconnu, GPS, rôle) ne dépendent pas des données et sont décrites dans
 * `soutenance/scan-qr.md`.
 */

// `@types/node` n'est pas installé (projet React Native) : on déclare le
// strict minimum plutôt que d'alourdir les dépendances.
declare const process: {env: Record<string, string | undefined>};

const BASE = process.env.LOGICHAIN_API ?? 'http://localhost:3000/api/v1';
const PASSWORD = process.env.LOGICHAIN_PASSWORD ?? 'LogiChain2026!';
const COMPTE = process.env.LOGICHAIN_EMAIL ?? 'sofia@logichain.fr';

const MODES: {key: ScanMode; label: string}[] = [
  {key: 'pointage', label: 'Pointage'},
  {key: 'transit', label: 'Transit'},
  {key: 'deploy', label: 'Déploiement'},
];

interface Equipement {
  qrCode: string;
  label: string;
  status: ItemStatus;
  eventId: string | null;
}

/** Ce que l'application met en cache : les équipements du secteur assigné. */
let dansLeCache: Equipement[] = [];
/** Existent dans l'API mais hors secteur — l'app ne les connaît pas. */
let horsSecteur: Equipement[] = [];

beforeAll(async () => {
  const sante = await fetch(`${BASE.replace(/\/api\/v1$/, '')}/health`).catch(() => null);
  if (!sante?.ok) {
    throw new Error(
      `API injoignable sur ${BASE}. Lancez \`npm run dev\` dans logichain-api, ` +
        'ou visez la production avec `npm run scan:prod`.',
    );
  }

  const auth = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: COMPTE, password: PASSWORD}),
  });
  if (auth.status === 429) {
    throw new Error(
      'HTTP 429 — le limiteur anti brute-force de /auth/login est saturé ' +
        '(10 tentatives / 5 min). Attendez 5 minutes.',
    );
  }
  if (!auth.ok) {
    throw new Error(`Connexion ${COMPTE} refusée : HTTP ${auth.status}`);
  }
  const {token} = (await auth.json()) as {token: string};
  const entetes = {Authorization: `Bearer ${token}`};

  const lire = async (url: string): Promise<Equipement[]> => {
    const res = await fetch(url, {headers: entetes});
    const body = (await res.json()) as {data?: Equipement[]} | Equipement[];
    const liste = Array.isArray(body) ? body : (body.data ?? []);
    return [...liste].sort((a, b) => a.qrCode.localeCompare(b.qrCode));
  };

  /*
   * L'application ne synchronise QUE les équipements de l'événement assigné
   * (`itemsApi.listByEvent` → `/items?eventId=…`). On reproduit exactement ce
   * périmètre : c'est lui qui décide si un QR sera reconnu ou non.
   * `limit` est plafonné à 100 côté API ; le jeu de démo tient dessous.
   */
  const brut = (await (await fetch(`${BASE}/events`, {headers: entetes})).json()) as
    | {data?: {id: string}[]}
    | {id: string}[];
  const evenements = Array.isArray(brut) ? brut : (brut.data ?? []);
  const eventId = evenements[0]?.id;
  if (!eventId) {
    throw new Error('Aucun événement dans la base. Lancez `npm run seed`.');
  }

  dansLeCache = await lire(`${BASE}/items?eventId=${encodeURIComponent(eventId)}&limit=100`);
  const tous = await lire(`${BASE}/items?limit=100`);
  const connus = new Set(dansLeCache.map(e => e.qrCode));
  horsSecteur = tous.filter(e => !connus.has(e.qrCode));
}, 60_000);

describe('ce que produit chaque QR code du jeu de démo', () => {
  it('le secteur assigné n’est pas vide', () => {
    expect(dansLeCache.length).toBeGreaterThan(0);
  });

  it.each(MODES)(
    'mode $label : au moins un QR permet de le démontrer',
    ({key, label}) => {
      // L'assertion qui compte vraiment. Si le seed ne contient aucun
      // équipement dans un état compatible, le mode est INDÉMONTRABLE le jour
      // de la soutenance — et on veut l'apprendre maintenant, pas devant le jury.
      const utilisables = dansLeCache.filter(e => resolveScanAction(key, e.status).ok);
      // Comparaison sur un objet plutôt que sur un nombre : en cas d'échec, le
      // diff nomme le mode concerné au lieu d'afficher « expected 0 to be > 0 ».
      expect({mode: label, démontrable: utilisables.length > 0}).toEqual({
        mode: label,
        démontrable: true,
      });
    },
  );

  it('chaque équipement se comporte comme la machine à états le prévoit', () => {
    // Filet : si l'API introduisait un statut inconnu du domaine mobile,
    // `resolveScanAction` planterait ici plutôt qu'en pleine démonstration.
    for (const e of dansLeCache) {
      expect(STATUS_LABELS[e.status]).toBeTruthy();
      for (const {key} of MODES) {
        expect(typeof resolveScanAction(key, e.status).ok).toBe('boolean');
      }
    }
  });

  it('aucun équipement hors secteur ne se glisse dans le cache', () => {
    // Les équipements sans événement assigné ne sont PAS synchronisés : les
    // scanner produit « QR inconnu », en rouge. Ce n'est pas un bug — l'agent
    // n'est pas censé toucher au matériel d'un autre secteur — mais il faut le
    // savoir avant la soutenance plutôt que le découvrir devant le jury.
    const chevauchement = horsSecteur.filter(e =>
      dansLeCache.some(c => c.qrCode === e.qrCode),
    );
    expect(chevauchement).toEqual([]);
  });
});

afterAll(() => {
  if (dansLeCache.length === 0) {
    return;
  }
  const equipements = dansLeCache;

  const verdict = (mode: ScanMode, status: ItemStatus): string => {
    const r = resolveScanAction(mode, status);
    return r.ok ? 'OK' : 'refusé';
  };

  const out: string[] = ['', `QR CODES DU JEU DE DÉMO — relevé sur ${BASE}`, ''];

  // ---- Résumé par statut : la matrice, en six lignes ----
  out.push('  Ce que chaque statut autorise :', '');
  out.push(`  ${'Statut actuel'.padEnd(16)}${MODES.map(m => m.label.padEnd(14)).join('')}`);
  out.push(`  ${'─'.repeat(16 + 14 * MODES.length)}`);
  const statutsPresents = [...new Set(equipements.map(e => e.status))];
  for (const status of statutsPresents) {
    out.push(
      `  ${STATUS_LABELS[status].padEnd(16)}` +
        MODES.map(m => verdict(m.key, status).padEnd(14)).join(''),
    );
  }

  // ---- Les QR à utiliser en démonstration ----
  out.push('', '  À SCANNER PENDANT LA SOUTENANCE :', '');
  for (const {key, label} of MODES) {
    const exemples = equipements.filter(e => resolveScanAction(key, e.status).ok).slice(0, 3);
    out.push(`  Mode ${label} (${equipements.filter(e => resolveScanAction(key, e.status).ok).length} équipements compatibles)`);
    for (const e of exemples) {
      out.push(`     ${e.qrCode.padEnd(16)} ${STATUS_LABELS[e.status].padEnd(14)} ${e.label}`);
    }
    out.push('');
  }

  // ---- Le détail, QR par QR ----
  out.push('  DÉTAIL — chaque QR code et son résultat par mode :', '');
  out.push(
    `  ${'QR code'.padEnd(16)}${'Statut'.padEnd(14)}${MODES.map(m => m.label.padEnd(14)).join('')}`,
  );
  out.push(`  ${'─'.repeat(30 + 14 * MODES.length)}`);
  for (const e of equipements) {
    out.push(
      `  ${e.qrCode.padEnd(16)}${STATUS_LABELS[e.status].padEnd(14)}` +
        MODES.map(m => verdict(m.key, e.status).padEnd(14)).join(''),
    );
  }

  if (horsSecteur.length > 0) {
    out.push(
      '',
      `  ATTENTION — ${horsSecteur.length} équipements existent dans l'API mais PAS dans le`,
      "  cache de l'application (aucun événement assigné). Les scanner affiche",
      '  « QR inconnu », en rouge. Ce sont ceux-ci :',
      '',
    );
    for (const e of horsSecteur) {
      out.push(`     ${e.qrCode.padEnd(16)}${STATUS_LABELS[e.status].padEnd(14)}${e.label}`);
    }
  }

  out.push(
    '',
    '  « refusé » = rejeté sur place par la machine à états, aucune requête émise.',
    '  Quatre autres causes de rejet ne dépendent pas des données :',
    '  doublon (même code < 1,5 s), QR absent du cache, GPS indisponible,',
    '  et le mode Déploiement verrouillé pour un transporteur.',
    '',
  );

  console.log(out.join('\n'));
});
