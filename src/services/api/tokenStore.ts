import * as Keychain from 'react-native-keychain';

export interface Tokens {
  token: string;
  refreshToken: string;
}

const SERVICE = 'logichain.tokens';

/** Stockage sécurisé des tokens JWT via le Keychain iOS (pas en clair). */
export const tokenStore = {
  async get(): Promise<Tokens | null> {
    const creds = await Keychain.getGenericPassword({service: SERVICE});
    return creds ? (JSON.parse(creds.password) as Tokens) : null;
  },
  async set(t: Tokens): Promise<void> {
    await Keychain.setGenericPassword('tokens', JSON.stringify(t), {service: SERVICE});
  },
  async clear(): Promise<void> {
    await Keychain.resetGenericPassword({service: SERVICE});
  },
};
