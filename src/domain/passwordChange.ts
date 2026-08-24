/**
 * Règles du changement de mot de passe, côté client.
 *
 * Miroir de `changePasswordSchema` + de la règle métier `password.must_differ`
 * de l'API : on valide localement pour un retour immédiat, mais l'API reste
 * l'autorité (elle seule connaît le hash réel).
 */

export interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type PasswordChangeErrors = Partial<Record<keyof PasswordChangeForm, string>>;

export function validatePasswordChange(form: PasswordChangeForm): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};

  if (form.currentPassword.length === 0) {
    errors.currentPassword = 'Saisis ton mot de passe actuel.';
  }
  if (form.newPassword.length < 8 || form.newPassword.length > 128) {
    errors.newPassword = 'Le nouveau mot de passe doit faire entre 8 et 128 caractères.';
  } else if (form.newPassword === form.currentPassword) {
    errors.newPassword = "Choisis un mot de passe différent de l'actuel.";
  }
  if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'La confirmation ne correspond pas.';
  }

  return errors;
}

export type AuthStatus = 'loading' | 'authed' | 'anon' | 'must_change_password';

/**
 * État d'authentification déduit de l'utilisateur courant.
 *
 * Un compte encore sur mot de passe temporaire n'est PAS `authed` : l'API lui
 * répond 403 sur toutes les routes métier, l'app doit donc l'aiguiller vers
 * l'écran de changement plutôt que vers un tableau de bord vide.
 */
export function resolveAuthStatus(
  user: {mustChangePassword?: boolean} | null | undefined,
): Exclude<AuthStatus, 'loading'> {
  if (!user) {
    return 'anon';
  }
  return user.mustChangePassword ? 'must_change_password' : 'authed';
}
