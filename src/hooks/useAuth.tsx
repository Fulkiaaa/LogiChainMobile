import React, {createContext, useContext, useEffect, useState} from 'react';

import {resolveAuthStatus, type AuthStatus} from '@/domain/passwordChange';
import {authApi} from '@/services/api/auth.api';
import {tokenStore} from '@/services/api/tokenStore';
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

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

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
        setUser(next);
        setStatus(resolveAuthStatus(next));
      } catch {
        await tokenStore.clear();
        setStatus('anon');
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
    setUser(next);
    setStatus(resolveAuthStatus(next));
  };

  const logout = async () => {
    await tokenStore.clear();
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
