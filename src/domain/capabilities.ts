import type {UserRole} from '@/types/api';

/** Libellés lisibles des rôles définis par l'API (`USER_ROLES`). */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  logistics_manager: 'Responsable logistique',
  field_agent: 'Agent de terrain',
  transporter: 'Transporteur',
};

/**
 * Les gestes que l'application mobile sait déclencher. Volontairement limité à
 * ceux-là : `allocate`, `DELETE /items/:id` ou `/dashboard/metrics` existent
 * côté API mais n'ont aucun point d'entrée ici, les lister donnerait une fausse
 * idée du périmètre de l'app.
 */
export type AppCapability = 'scan' | 'transit' | 'deploy' | 'anomaly' | 'lost' | 'manageUsers';

export const ALL_CAPABILITIES: readonly AppCapability[] = [
  'scan',
  'transit',
  'deploy',
  'anomaly',
  'lost',
  'manageUsers',
];

export const CAPABILITY_LABELS: Record<AppCapability, string> = {
  scan: 'Pointer un équipement',
  transit: 'Déclarer un chargement / transit',
  deploy: 'Déployer sur site',
  anomaly: 'Signaler une anomalie',
  lost: 'Déclarer une perte',
  manageUsers: 'Créer des comptes utilisateurs',
};

/**
 * Miroir de la matrice d'autorisation de l'API pour ces gestes.
 * `null` = ouvert à tout compte authentifié.
 *
 * L'API reste l'autorité — ce module ne la remplace pas, il l'anticipe pour ne
 * pas proposer un geste qui finirait en 403. Le 403 n'est pas traité comme un
 * conflit par `decideReconcile` : il serait rejoué cinq fois puis annulé sans
 * un mot d'explication. Mieux vaut ne jamais l'émettre.
 */
const ALLOWED: Record<AppCapability, readonly UserRole[] | null> = {
  scan: null,
  transit: null,
  anomaly: null,
  lost: null,
  // « Le transporteur achemine, il n'installe pas » — requireRole côté API.
  deploy: ['admin', 'logistics_manager', 'field_agent'],
  manageUsers: ['admin'],
};

export function can(role: UserRole | null | undefined, cap: AppCapability): boolean {
  // Fermé par défaut : tant que /auth/me n'a pas répondu, on ne propose rien
  // qu'on ne puisse tenir.
  if (!role) {
    return false;
  }
  const allowed = ALLOWED[cap];
  return allowed === null || allowed.includes(role);
}

export function allowedCapabilities(role: UserRole | null | undefined): AppCapability[] {
  return ALL_CAPABILITIES.filter((cap) => can(role, cap));
}

/**
 * Phrase affichée à côté d'un geste grisé. Elle nomme le rôle de l'utilisateur
 * ET ceux qui ont le droit : sans les deux, l'utilisateur sait qu'il est bloqué
 * mais pas pourquoi, ni à qui s'adresser.
 */
export function whyNot(role: UserRole | null | undefined, cap: AppCapability): string | null {
  if (can(role, cap)) {
    return null;
  }
  if (!role) {
    return 'Rôle inconnu : reconnectez-vous pour accéder à cette action.';
  }
  const allowed = ALLOWED[cap] ?? [];
  const qui = allowed.map((r) => ROLE_LABELS[r]).join(', ');
  return `Réservé à : ${qui}. Vous êtes ${ROLE_LABELS[role]}.`;
}
