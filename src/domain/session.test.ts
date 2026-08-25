import {decideSessionStart, parseCachedProfile, type SessionProfile} from '@/domain/session';

const PROFILE: SessionProfile = {
  id: 'u1',
  email: 'transports-vert@logichain.fr',
  fullName: 'Paul Rivière',
  role: 'transporter',
  mustChangePassword: false,
};

describe('démarrage de session', () => {
  test('serveur injoignable + profil en cache → la session survit', () => {
    // Le cas du terrain : l'app est relancée en zone blanche. Déconnecter
    // l'agent serait définitif, puisque le login exige le réseau.
    const r = decideSessionStart('unreachable', PROFILE);
    expect(r.status).toBe('authenticated');
    expect(r.status === 'authenticated' && r.source).toBe('cache');
  });

  test('serveur qui refuse → déconnexion, même avec un profil en cache', () => {
    // Jeton expiré ou compte désactivé : le cache ne doit rien rattraper.
    expect(decideSessionStart('rejected', PROFILE).status).toBe('anon');
  });

  test('serveur injoignable sans profil connu → on ne peut rien afficher', () => {
    expect(decideSessionStart('unreachable', null).status).toBe('anon');
  });
});

describe('profil mis en cache', () => {
  test('relu tel quel', () => {
    expect(parseCachedProfile(JSON.stringify(PROFILE))?.role).toBe('transporter');
  });

  test('un contenu illisible ou vide vaut absence, jamais une exception', () => {
    expect(parseCachedProfile('{pas du json')).toBeNull();
    expect(parseCachedProfile('')).toBeNull();
    expect(parseCachedProfile(null)).toBeNull();
  });

  test('un profil amputé de son rôle est rejeté : il verrouillerait tous les gestes', () => {
    expect(parseCachedProfile('{"id":"u1","email":"a@b.fr"}')).toBeNull();
  });
});
