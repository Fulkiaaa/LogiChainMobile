import {
  resolveAuthStatus,
  validatePasswordChange,
  type PasswordChangeForm,
} from './passwordChange';

const form = (over: Partial<PasswordChangeForm> = {}): PasswordChangeForm => ({
  currentPassword: 'Temporaire2026!',
  newPassword: 'MonVraiMotDePasse1!',
  confirmPassword: 'MonVraiMotDePasse1!',
  ...over,
});

describe('validatePasswordChange', () => {
  it('accepte un formulaire correct', () => {
    expect(validatePasswordChange(form())).toEqual({});
  });

  it('exige le mot de passe actuel', () => {
    expect(validatePasswordChange(form({currentPassword: ''})).currentPassword).toBeDefined();
  });

  it('refuse un nouveau mot de passe de moins de 8 caractères', () => {
    expect(validatePasswordChange(form({newPassword: 'court1!', confirmPassword: 'court1!'})).newPassword)
      .toBeDefined();
  });

  it('refuse un nouveau mot de passe identique à l\'actuel', () => {
    // Même règle que l'API (BusinessRuleError password.must_differ) : autant la
    // signaler avant l'aller-retour réseau.
    const errors = validatePasswordChange(
      form({newPassword: 'Temporaire2026!', confirmPassword: 'Temporaire2026!'}),
    );
    expect(errors.newPassword).toBeDefined();
  });

  it('refuse une confirmation qui ne correspond pas', () => {
    expect(validatePasswordChange(form({confirmPassword: 'AutreChose1!'})).confirmPassword)
      .toBeDefined();
  });
});

describe('resolveAuthStatus', () => {
  it('renvoie anon sans utilisateur', () => {
    expect(resolveAuthStatus(null)).toBe('anon');
  });

  it('renvoie must_change_password tant que le mot de passe est temporaire', () => {
    expect(resolveAuthStatus({mustChangePassword: true})).toBe('must_change_password');
  });

  it('renvoie authed une fois le mot de passe changé', () => {
    expect(resolveAuthStatus({mustChangePassword: false})).toBe('authed');
  });

  it('considère un utilisateur sans drapeau comme authentifié', () => {
    // Tolérance de compatibilité : un jeton émis avant cette fonctionnalité ne
    // porte pas le champ. Le bloquer déconnecterait tout le parc au déploiement.
    expect(resolveAuthStatus({})).toBe('authed');
  });
});
