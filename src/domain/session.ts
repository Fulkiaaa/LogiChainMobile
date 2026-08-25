import type {UserRole} from '@/types/api';

/** Profil minimal conservé localement pour survivre à une coupure réseau. */
export interface SessionProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
}

/** Pourquoi la vérification de session au démarrage n'a pas abouti. */
export type SessionFailure =
  /** Le serveur a répondu, et il refuse : jeton expiré, compte désactivé. */
  | 'rejected'
  /** Le serveur n'a pas répondu du tout : zone blanche, mode avion, API à terre. */
  | 'unreachable';

export type SessionStart =
  | {status: 'authenticated'; profile: SessionProfile; source: 'server' | 'cache'}
  | {status: 'anon'};

/**
 * Que faire au démarrage quand `/auth/me` n'a pas abouti.
 *
 * La distinction est la clé d'une application offline-first : un refus du
 * serveur doit déconnecter, une absence de réseau ne le doit PAS. Confondre
 * les deux — ce que faisait un `catch` unique — éjectait l'agent de son
 * application en zone blanche, alors qu'il a tout ce qu'il faut en cache pour
 * continuer à travailler. Et comme le login exige le réseau, il ne pouvait
 * même pas revenir.
 *
 * Le profil mis en cache ne donne aucun droit : l'API revérifie le jeton à
 * chaque appel. Il ne sert qu'à savoir quoi afficher, et quels gestes proposer.
 */
export function decideSessionStart(
  failure: SessionFailure,
  cached: SessionProfile | null,
): SessionStart {
  if (failure === 'rejected' || !cached) {
    return {status: 'anon'};
  }
  return {status: 'authenticated', profile: cached, source: 'cache'};
}

/** Relit le profil mis en cache. Tolérant : un contenu illisible vaut absence. */
export function parseCachedProfile(raw: string | null | undefined): SessionProfile | null {
  if (!raw) {
    return null;
  }
  try {
    const p = JSON.parse(raw) as Partial<SessionProfile>;
    if (!p.id || !p.email || !p.role) {
      return null;
    }
    return {
      id: p.id,
      email: p.email,
      fullName: p.fullName ?? p.email,
      role: p.role,
      mustChangePassword: p.mustChangePassword ?? false,
    };
  } catch {
    return null;
  }
}
