import type {ColorScheme} from '@/domain/theme';
import type {ItemCategory, ItemStatus} from '@/types/api';

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  primary: string;
  /** Texte posé SUR `primary` (boutons pleins) — doit contraster avec lui. */
  onPrimary: string;
  success: string;
  danger: string;
  warning: string;
  border: string;
}

const DARK: Palette = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  primary: '#38bdf8',
  onPrimary: '#0f172a',
  success: '#4ade80',
  danger: '#f87171',
  warning: '#fbbf24',
  border: '#334155',
};

/**
 * Palette claire. Les teintes sont assombries par rapport au thème sombre :
 * un `#4ade80` lisible sur fond ardoise devient illisible sur fond blanc.
 */
const LIGHT: Palette = {
  bg: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  primary: '#0284c7',
  onPrimary: '#ffffff',
  success: '#15803d',
  danger: '#b91c1c',
  warning: '#b45309',
  border: '#cbd5e1',
};

export const PALETTES: Record<ColorScheme, Palette> = {dark: DARK, light: LIGHT};

/**
 * Palette par défaut, conservée pour les rares usages hors composant React
 * (thème de navigation initial). Dans un composant, utiliser `useTheme()`.
 */
export const COLORS = DARK;

export const STATUS_LABELS: Record<ItemStatus, string> = {
  in_stock: 'En stock',
  allocated: 'Alloué',
  in_transit: 'En transit',
  deployed: 'Déployé',
  in_maintenance: 'Maintenance',
  lost: 'Perdu',
};

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  staging: 'Structure scénique',
  sound: 'Son',
  lighting: 'Éclairage',
  video: 'Vidéo',
  power: 'Énergie',
  tent: 'Tente',
  furniture: 'Mobilier',
  sanitary: 'Sanitaire',
  fencing: 'Clôture',
  other: 'Autre',
};

/**
 * Libellé affichable d'une catégorie, à partir d'une clé non typée.
 *
 * `byCategory` du rapport carbone arrive en `Record<string, number>` : rien ne
 * garantit que ses clés appartiennent à l'énumération. On retombe sur la clé
 * brute plutôt que d'afficher « undefined » si l'API en ajoute une.
 */
export function categoryLabel(key: string): string {
  return CATEGORY_LABELS[key as ItemCategory] ?? key;
}

/** Couleurs de statut déclinées par apparence, pour rester lisibles sur les deux fonds. */
export const STATUS_COLORS_BY_SCHEME: Record<ColorScheme, Record<ItemStatus, string>> = {
  dark: {
    in_stock: '#94a3b8',
    allocated: '#38bdf8',
    in_transit: '#fbbf24',
    deployed: '#4ade80',
    in_maintenance: '#a78bfa',
    lost: '#f87171',
  },
  light: {
    in_stock: '#475569',
    allocated: '#0369a1',
    in_transit: '#b45309',
    deployed: '#15803d',
    in_maintenance: '#6d28d9',
    lost: '#b91c1c',
  },
};

export const STATUS_COLORS = STATUS_COLORS_BY_SCHEME.dark;
