import React, {createContext, useContext, useEffect, useState} from 'react';

import {authApi} from '@/services/api/auth.api';
import {tokenStore} from '@/services/api/tokenStore';
import type {MeUser, UserRole} from '@/types/api';

type AuthStatus = 'loading' | 'authed' | 'anon';

interface AuthContextValue {
  user: {id: string; email: string; role: UserRole} | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    (async () => {
      const tokens = await tokenStore.get();
      if (!tokens) {
        setStatus('anon');
        return;
      }
      try {
        const me: MeUser = await authApi.me();
        setUser(me);
        setStatus('authed');
      } catch {
        await tokenStore.clear();
        setStatus('anon');
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await tokenStore.set({token: res.token, refreshToken: res.refreshToken});
    setUser({id: res.user.id, email: res.user.email, role: res.user.role});
    setStatus('authed');
  };

  const logout = async () => {
    await tokenStore.clear();
    setUser(null);
    setStatus('anon');
  };

  return (
    <AuthContext.Provider value={{user, status, login, logout}}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return ctx;
}
