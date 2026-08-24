/** Mode choisi par l'utilisateur. `auto` délègue au réglage iOS. */
export type ThemeMode = 'auto' | 'light' | 'dark';

/** Apparence effectivement appliquée, une fois `auto` résolu. */
export type ColorScheme = 'light' | 'dark';

const MODES: ThemeMode[] = ['auto', 'light', 'dark'];

/** Garde-fou sur la valeur relue en base, qui peut être corrompue ou absente. */
export const isThemeMode = (v: unknown): v is ThemeMode =>
  typeof v === 'string' && (MODES as string[]).includes(v);

/**
 * Résout le mode choisi en apparence réelle.
 * `useColorScheme()` peut renvoyer null (système indéterminé) : on retombe
 * alors sur sombre, qui est l'apparence historique de l'app.
 */
export function resolveScheme(
  mode: ThemeMode,
  systemScheme: ColorScheme | null | undefined,
): ColorScheme {
  if (mode !== 'auto') {
    return mode;
  }
  return systemScheme ?? 'dark';
}
