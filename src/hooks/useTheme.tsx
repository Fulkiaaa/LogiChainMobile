import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {useColorScheme} from 'react-native';

import {PALETTES, STATUS_COLORS_BY_SCHEME, type Palette} from '@/config/theme';
import {isThemeMode, resolveScheme, type ColorScheme, type ThemeMode} from '@/domain/theme';
import {metaRepo} from '@/services/db/database';
import type {ItemStatus} from '@/types/api';

const META_KEY = 'themeMode';

interface ThemeContextValue {
  /** Palette effective — à consommer dans les styles. */
  c: Palette;
  statusColors: Record<ItemStatus, string>;
  /** Choix de l'utilisateur (`auto` par défaut). */
  mode: ThemeMode;
  /** Apparence réellement appliquée, une fois `auto` résolu. */
  scheme: ColorScheme;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({children}: {children: React.ReactNode}) {
  // useColorScheme() peut renvoyer 'unspecified' : on ne garde que light/dark.
  const raw = useColorScheme();
  const system: ColorScheme | null = raw === 'light' || raw === 'dark' ? raw : null;
  const [mode, setModeState] = useState<ThemeMode>('auto');

  // Relecture du choix persisté. La table sync_meta existe déjà : pas de
  // nouvelle dépendance de stockage.
  useEffect(() => {
    try {
      const saved = metaRepo.get(META_KEY);
      if (isThemeMode(saved)) {
        setModeState(saved);
      }
    } catch {
      // Base pas encore prête : on reste sur 'auto'.
    }
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try {
      metaRepo.set(META_KEY, m);
    } catch {
      // Échec d'écriture : le choix reste appliqué pour la session.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = resolveScheme(mode, system);
    return {
      c: PALETTES[scheme],
      statusColors: STATUS_COLORS_BY_SCHEME[scheme],
      mode,
      scheme,
      setMode,
    };
  }, [mode, system, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  }
  return ctx;
}
