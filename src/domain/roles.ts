import {can} from '@/domain/capabilities';
import {unmetPasswordRules} from '@/domain/passwordChange';
import type {UserRole} from '@/types/api';

// La matrice d'autorisation vit dans `capabilities.ts`, seule source de vérité.
// Ré-exporté ici pour que les écrans gardent un point d'entrée unique.
export {ROLE_LABELS} from '@/domain/capabilities';

/**
 * Seul l'admin peut créer un utilisateur : `POST /auth/register` est protégé
 * par `requireRole('admin')` côté API.
 */
export const canManageUsers = (role: UserRole | undefined | null): boolean =>
  can(role, 'manageUsers');

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
