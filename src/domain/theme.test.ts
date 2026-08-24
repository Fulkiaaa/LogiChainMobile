import {isThemeMode, resolveScheme} from '@/domain/theme';

describe('resolveScheme', () => {
  it('suit le système en mode auto', () => {
    expect(resolveScheme('auto', 'dark')).toBe('dark');
    expect(resolveScheme('auto', 'light')).toBe('light');
  });

  it('retombe sur sombre quand le système ne dit rien', () => {
    expect(resolveScheme('auto', null)).toBe('dark');
    expect(resolveScheme('auto', undefined)).toBe('dark');
  });

  it('ignore le système quand un mode est forcé', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
    expect(resolveScheme('light', null)).toBe('light');
  });
});

describe('isThemeMode', () => {
  it('accepte les 3 modes valides', () => {
    expect(isThemeMode('auto')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
  });

  it('rejette une valeur corrompue lue en base', () => {
    expect(isThemeMode('bleu')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode('')).toBe(false);
  });
});
