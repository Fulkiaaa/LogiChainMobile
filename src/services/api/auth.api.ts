import type {LoginResult, MeUser, UserJSON, UserRole} from '@/types/api';

import {api} from './index';

interface ApiErrorEnvelope {
  error?: {code?: string; message?: string};
}

/** L'API renvoie `{error: {code, message}}`. On en tire un message affichable. */
function readApiError(data: unknown, status: number): string {
  const msg = (data as ApiErrorEnvelope)?.error?.message;
  if (msg) {
    return msg;
  }
  return status === 403
    ? "Action réservée aux administrateurs."
    : `Échec de la création (HTTP ${status}).`;
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResult> {
    const {data} = await api.apiFetch<LoginResult>('/auth/login', {
      method: 'POST',
      body: {email, password},
    });
    return data;
  },
  async me(): Promise<MeUser> {
    const {data} = await api.apiFetch<MeUser>('/auth/me', {auth: true});
    return data;
  },
  /**
   * Remplacement du mot de passe temporaire. L'API renvoie une NOUVELLE paire de
   * jetons : l'ancienne porte encore `mustChangePassword` et resterait bloquée
   * par le middleware côté serveur.
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<LoginResult> {
    const {status, data} = await api.apiFetch<LoginResult | ApiErrorEnvelope>('/auth/password', {
      method: 'PATCH',
      body: {currentPassword, newPassword},
      auth: true,
    });
    if (status < 200 || status >= 300) {
      throw new Error(readApiError(data, status));
    }
    return data as LoginResult;
  },
  /** Création d'un utilisateur. Réservé aux admins côté API (`requireRole`). */
  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    role?: UserRole;
  }): Promise<UserJSON> {
    const {status, data} = await api.apiFetch<UserJSON | ApiErrorEnvelope>('/auth/register', {
      method: 'POST',
      body: payload,
      auth: true,
    });
    if (status < 200 || status >= 300) {
      throw new Error(readApiError(data, status));
    }
    return data as UserJSON;
  },
};
