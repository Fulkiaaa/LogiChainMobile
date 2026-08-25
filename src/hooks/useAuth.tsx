import React, {createContext, useContext, useEffect, useState} from 'react';

import {resolveAuthStatus, type AuthStatus} from '@/domain/passwordChange';
import {AuthRejectedError, authApi} from '@/services/api/auth.api';
import {tokenStore} from '@/services/api/tokenStore';
import {metaRepo} from '@/services/db/database';
import {decideSessionStart, parseCachedProfile} from '@/domain/session';
import type {MeUser, UserRole} from '@/types/api';

interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  /** Remplace le mot de passe temporaire et débloque l'accès aux routes métier. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Clé du profil mis en cache dans `sync_meta`. */
const PROFILE_KEY = 'sessionProfile';

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  /** Conserve de quoi rouvrir l'application hors réseau. */
  const remember = (u: AuthUser) => metaRepo.set(PROFILE_KEY, JSON.stringify(u));

  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.get();
      if (!tokens) {
        setStatus('anon');
        return;
      }
      try {
        // /auth/me n'est PAS derrière requirePasswordChanged côté API,
        // justement pour que l'app puisse découvrir cet état au démarrage.
        const me: MeUser = await authApi.me();
        const next = {...me, mustChangePassword: me.mustChangePassword ?? false};
        remember(next);
        setUser(next);
        setStatus(resolveAuthStatus(next));
      } catch (e) {
        /*
         * Deux échecs très différents se ressemblent ici, et les confondre
         * éjectait l'agent de son application en zone blanche — sans retour
         * possible, puisque le login exige le réseau.
         *   • le serveur REFUSE (jeton expiré, compte désactivé) → déconnecter
         *   • le serveur est INJOIGNABLE → garder la session, travailler sur
         *     le cache. C'est la promesse offline-first de l'application.
         */
        const failure = e instanceof AuthRejectedError ? 'rejected' : 'unreachable';
        const decision = decideSessionStart(failure, parseCachedProfile(metaRepo.get(PROFILE_KEY)));
        if (decision.status === 'anon') {
          await tokenStore.clear();
          metaRepo.set(PROFILE_KEY, '');
          setStatus('anon');
          return;
        }
        setUser(decision.profile);
        setStatus(resolveAuthStatus(decision.profile));
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await tokenStore.set({token: res.token, refreshToken: res.refreshToken});
    const next = {
      id: res.user.id,
      email: res.user.email,
      fullName: res.user.fullName,
      role: res.user.role,
      mustChangePassword: res.user.mustChangePassword ?? false,
    };
    remember(next);
    setUser(next);
    setStatus(resolveAuthStatus(next));
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await authApi.changePassword(currentPassword, newPassword);
    // Les jetons renvoyés ne portent plus le drapeau : les stocker AVANT de
    // changer d'état, sinon le premier appel du tableau de bord repart avec
    // l'ancien jeton et se fait refuser.
    await tokenStore.set({token: res.token, refreshToken: res.refreshToken});
    const next = {
      id: res.user.id,
      email: res.user.email,
      fullName: res.user.fullName,
      role: res.user.role,
      mustChangePassword: res.user.mustChangePassword ?? false,
    };
    remember(next);
    setUser(next);
    setStatus(resolveAuthStatus(next));
  };

  const logout = async () => {
    await tokenStore.clear();
    metaRepo.set(PROFILE_KEY, '');
    setUser(null);
    setStatus('anon');
  };

  return (
    <AuthContext.Provider value={{user, status, login, changePassword, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return ctx;
}
