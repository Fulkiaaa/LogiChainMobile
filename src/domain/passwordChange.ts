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

/**
 * Critères de robustesse, miroir de `strongPasswordSchema` côté API.
 * Toute modification ici doit être répercutée là-bas, et réciproquement.
 */
export const PASSWORD_RULES = [
  {test: (v: string) => v.length >= 8 && v.length <= 128, label: 'Entre 8 et 128 caractères'},
  {test: (v: string) => /[a-z]/.test(v), label: 'Une minuscule'},
  {test: (v: string) => /[A-Z]/.test(v), label: 'Une majuscule'},
  {test: (v: string) => /[0-9]/.test(v), label: 'Un chiffre'},
  {test: (v: string) => /[^A-Za-z0-9]/.test(v), label: 'Un caractère spécial'},
] as const;

/** Critères non satisfaits, pour un affichage sous forme de liste à cocher. */
export function unmetPasswordRules(password: string): string[] {
  return PASSWORD_RULES.filter((r) => !r.test(password)).map((r) => r.label);
}

export const isStrongPassword = (password: string): boolean =>
  unmetPasswordRules(password).length === 0;

export function validatePasswordChange(form: PasswordChangeForm): PasswordChangeErrors {
  const errors: PasswordChangeErrors = {};

  if (form.currentPassword.length === 0) {
    errors.currentPassword = 'Saisis ton mot de passe actuel.';
  }
  const unmet = unmetPasswordRules(form.newPassword);
  if (unmet.length > 0) {
    errors.newPassword = `Il manque : ${unmet.join(', ').toLowerCase()}.`;
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
