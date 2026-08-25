import {
  ALL_CAPABILITIES,
  CAPABILITY_LABELS,
  ROLE_LABELS,
  allowedCapabilities,
  can,
} from '@/domain/capabilities';
import type {AppCapability} from '@/domain/capabilities';
import type {UserRole} from '@/types/api';

/**
 * SIMULATION DU PARCOURS RÉEL, RÔLE PAR RÔLE.
 *
 * Ce test ne tourne pas avec `npm test` : il a besoin d'une API vivante.
 *
 *   npm run parcours          → API locale (http://localhost:3000)
 *   npm run parcours:prod     → API de production
 *
 * Il se connecte réellement avec les 4 comptes de démo et tente chacun des
 * gestes que l'application sait déclencher. Puis il compare la réponse du
 * serveur à la matrice locale (`capabilities.ts`).
 *
 * Autrement dit : il prouve que ce que l'app grise correspond exactement à ce
 * que l'API refuse. Si l'un des deux dérive, ce test casse.
 *
 * ── Comment la sonde évite d'abîmer le jeu de démo ──
 * Toutes les requêtes visent un identifiant d'équipement volontairement
 * inexistant. Les middlewares Express s'exécutent dans l'ordre
 * `requireRole` → `validate` → contrôleur : un rôle interdit est donc rejeté
 * (403) AVANT toute lecture ou écriture en base, et un rôle autorisé retombe
 * sur un 400/404 sans rien modifier.
 *
 *   403          = refusé à cause du rôle
 *   400/404/422  = la garde de rôle a laissé passer
 */

// `@types/node` n'est pas installé (projet React Native) : on déclare le
// strict minimum plutôt que d'alourdir les dépendances pour deux variables.
declare const process: {env: Record<string, string | undefined>};

const BASE = process.env.LOGICHAIN_API ?? 'http://localhost:3000/api/v1';
const PASSWORD = process.env.LOGICHAIN_PASSWORD ?? 'LogiChain2026!';
const ITEM_INEXISTANT = '000000000000000000000000';

const COMPTES: Record<UserRole, string> = {
  admin: 'admin@logichain.fr',
  logistics_manager: 'responsable@logichain.fr',
  field_agent: 'sofia@logichain.fr',
  transporter: 'transports-vert@logichain.fr',
};

/** Le geste de l'app → l'appel HTTP qu'il déclenche réellement. */
const SONDE: Record<AppCapability, {method: string; path: string}> = {
  scan: {method: 'POST', path: `/items/${ITEM_INEXISTANT}/scan`},
  transit: {method: 'POST', path: `/items/${ITEM_INEXISTANT}/transit`},
  deploy: {method: 'POST', path: `/items/${ITEM_INEXISTANT}/deploy`},
  anomaly: {method: 'POST', path: `/items/${ITEM_INEXISTANT}/anomaly`},
  lost: {method: 'POST', path: `/items/${ITEM_INEXISTANT}/lost`},
  maintenance: {method: 'POST', path: `/items/${ITEM_INEXISTANT}/maintenance`},
  manageUsers: {method: 'POST', path: '/auth/register'},
};

const ROLES = Object.keys(COMPTES) as UserRole[];

const tokens: Partial<Record<UserRole, string>> = {};
/** Code HTTP relevé, par rôle puis par geste. Sert au tableau final. */
const releve: Partial<Record<UserRole, Record<string, number>>> = {};

async function login(role: UserRole): Promise<string> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: COMPTES[role], password: PASSWORD}),
  });
  if (res.status === 429) {
    throw new Error(
      'HTTP 429 — le limiteur anti brute-force de /auth/login est saturé ' +
        '(10 tentatives / 5 min). Attendez 5 minutes avant de relancer.',
    );
  }
  if (!res.ok) {
    throw new Error(`Connexion ${COMPTES[role]} refusée : HTTP ${res.status}`);
  }
  return (await res.json()).token as string;
}

async function sonder(role: UserRole, cap: AppCapability): Promise<number> {
  const {method, path} = SONDE[cap];
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens[role]}`,
    },
    body: '{}',
  });
  return res.status;
}

beforeAll(async () => {
  const sante = await fetch(`${BASE.replace(/\/api\/v1$/, '')}/health`).catch(() => null);
  if (!sante?.ok) {
    throw new Error(
      `API injoignable sur ${BASE}. Lancez \`npm run dev\` dans logichain-api, ` +
        'ou visez la production avec `npm run parcours:prod`.',
    );
  }
  for (const role of ROLES) {
    tokens[role] = await login(role);
    releve[role] = {};
  }
}, 60_000);

describe.each(ROLES)('parcours réel — %s', (role) => {
  it.each(ALL_CAPABILITIES)(
    `${role} · %s : le serveur tranche comme la matrice de l'app`,
    async (cap) => {
      const status = await sonder(role, cap);
      releve[role]![cap] = status;

      const refuseParLeServeur = status === 403;
      const refuseParLApp = !can(role, cap);

      // Le cœur du test : les deux verdicts doivent coïncider. Un écart signifie
      // soit que l'app propose un geste voué au 403, soit qu'elle en grise un
      // qui était permis.
      expect({geste: cap, refuse: refuseParLeServeur}).toEqual({
        geste: cap,
        refuse: refuseParLApp,
      });
    },
    30_000,
  );
});

afterAll(() => {
  const ligne = (label: string, cellules: string[]) =>
    `  ${label.padEnd(24)}${cellules.map((c) => c.padEnd(14)).join('')}`;

  const sortie: string[] = [
    '',
    `PARCOURS PAR RÔLE — relevé sur ${BASE}`,
    '',
    ligne('', ROLES.map((r) => ROLE_LABELS[r].slice(0, 12))),
    `  ${'─'.repeat(24 + 14 * ROLES.length)}`,
  ];

  for (const cap of ALL_CAPABILITIES) {
    sortie.push(
      ligne(
        CAPABILITY_LABELS[cap].slice(0, 23),
        ROLES.map((r) => {
          const status = releve[r]?.[cap];
          if (status === undefined) return '·';
          return status === 403 ? `INTERDIT ${status}` : `permis ${status}`;
        }),
      ),
    );
  }

  sortie.push('', '  Résumé — ce que chaque rôle peut faire dans l’application :', '');
  for (const role of ROLES) {
    const permis = allowedCapabilities(role).map((c) => CAPABILITY_LABELS[c]);
    sortie.push(`  ${ROLE_LABELS[role]} (${permis.length}/${ALL_CAPABILITIES.length})`);
    for (const cap of ALL_CAPABILITIES) {
      const ok = can(role, cap);
      sortie.push(`     ${ok ? '✓' : '✗'} ${CAPABILITY_LABELS[cap]}`);
    }
    sortie.push('');
  }
  sortie.push('  403 = refusé par la garde de rôle · autre code = la garde a laissé passer', '');

  console.log(sortie.join('\n'));
});
