import type {LoginResult, MeUser} from '@/types/api';

import {api} from './index';

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
};
