import {ROLE_LABELS, canManageUsers, validateNewUser} from '@/domain/roles';

describe('canManageUsers', () => {
  it('autorise uniquement admin', () => {
    expect(canManageUsers('admin')).toBe(true);
    expect(canManageUsers('logistics_manager')).toBe(false);
    expect(canManageUsers('field_agent')).toBe(false);
    expect(canManageUsers('transporter')).toBe(false);
  });

  it('refuse quand le rôle est inconnu (utilisateur non chargé)', () => {
    expect(canManageUsers(undefined)).toBe(false);
  });
});

describe('ROLE_LABELS', () => {
  it('couvre les 4 rôles de l’API', () => {
    expect(Object.keys(ROLE_LABELS).sort()).toEqual([
      'admin',
      'field_agent',
      'logistics_manager',
      'transporter',
    ]);
  });
});

describe('validateNewUser', () => {
  const valid = {email: 'a@b.fr', password: 'motdepasse1', fullName: 'Sofia Lemaire'};

  it('accepte un formulaire valide', () => {
    expect(validateNewUser(valid)).toEqual({});
  });

  it('rejette un email mal formé', () => {
    expect(validateNewUser({...valid, email: 'pas-un-email'}).email).toBeDefined();
  });

  it('rejette un mot de passe de moins de 8 caractères (contrainte API)', () => {
    expect(validateNewUser({...valid, password: 'court'}).password).toBeDefined();
  });

  it('rejette un mot de passe de plus de 128 caractères (contrainte API)', () => {
    expect(validateNewUser({...valid, password: 'x'.repeat(129)}).password).toBeDefined();
  });

  it('rejette un nom vide ou uniquement des espaces', () => {
    expect(validateNewUser({...valid, fullName: '   '}).fullName).toBeDefined();
  });

  it('rejette un nom de plus de 120 caractères (contrainte API)', () => {
    expect(validateNewUser({...valid, fullName: 'x'.repeat(121)}).fullName).toBeDefined();
  });
});
