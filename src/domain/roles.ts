import {unmetPasswordRules} from '@/domain/passwordChange';
import type {UserRole} from '@/types/api';

/** Libellés lisibles des rôles définis par l'API (`USER_ROLES`). */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  logistics_manager: 'Responsable logistique',
  field_agent: 'Agent de terrain',
  transporter: 'Transporteur',
};

/**
 * Seul l'admin peut créer un utilisateur : `POST /auth/register` est protégé
 * par `requireRole('admin')` côté API. On reproduit la règle ici pour ne pas
 * afficher un formulaire voué à un 403.
 */
export const canManageUsers = (role: UserRole | undefined | null): boolean => role === 'admin';

export interface NewUserForm {
  email: string;
  password: string;
  fullName: string;
}

export type NewUserErrors = Partial<Record<keyof NewUserForm, string>>;

/**
 * Reproduit `registerSchema` de l'API (email, mot de passe robuste, fullName 1-120)
 * pour donner un retour immédiat, y compris hors ligne. L'API reste l'autorité.
 */
export function validateNewUser(form: NewUserForm): NewUserErrors {
  const errors: NewUserErrors = {};

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Adresse email invalide.';
  }
  // Mêmes critères que le mot de passe définitif : le temporaire est transmis
  // hors de l'application et reste valable jusqu'à la première connexion.
  const unmet = unmetPasswordRules(form.password);
  if (unmet.length > 0) {
    errors.password = `Il manque : ${unmet.join(', ').toLowerCase()}.`;
  }
  const name = form.fullName.trim();
  if (name.length < 1 || name.length > 120) {
    errors.fullName = 'Le nom doit faire entre 1 et 120 caractères.';
  }

  return errors;
}
