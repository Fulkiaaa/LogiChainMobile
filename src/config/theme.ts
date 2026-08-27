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
  /** Séparateur décoratif : filets de listes, bords de cartes. Non porteur de sens. */
  border: string;
  /**
   * Limite d'un contrôle — contour de champ, bouton fantôme.
   *
   * Distinct de `border` parce que WCAG 1.4.11 attend 3:1 pour tout élément
   * d'interface non textuel : le bord d'un champ de saisie EST une information
   * (« on peut écrire ici »), là où un filet de liste n'est qu'un ornement.
   * `border` seul valait 1,4:1 en clair — les champs ne se détachaient pas.
   */
  borderStrong: string;
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
  borderStrong: '#64748b',
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
  // `#0284c7` échouait sur les TROIS fonds (3,3 à 4,1:1) — or `primary` porte
  // tous les liens, toutes les icônes actives et l'onglet sélectionné. Un cran
  // plus foncé suffit : 5,7:1 sur le fond, 5,9:1 sur une carte.
  primary: '#0369a1',
  onPrimary: '#ffffff',
  success: '#15803d',
  danger: '#b91c1c',
  warning: '#b45309',
  border: '#cbd5e1',
  // Même valeur qu'en sombre : c'est le gris médian, le seul qui tienne les
  // 3:1 sur un fond ardoise (3,75:1) comme sur un fond blanc cassé (4,55:1).
  borderStrong: '#64748b',
};

export const PALETTES: Record<ColorScheme, Palette> = {dark: DARK, light: LIGHT};

/**
 * Échelle d'espacement, grille de 4 pt.
 *
 * Le code comptait 19 valeurs différentes, dont sept hors grille (3, 5, 11, 13,
 * 18, 22, 34) : chaque écran avait improvisé ses marges, et un même élément —
 * l'intitulé de section — valait 20 px ici, 22 là, 12 ailleurs.
 */
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Échelle typographique, rapport ~1,25 entre deux échelons.
 *
 * Il y avait treize tailles, dont cinq séparées d'un facteur 1,08 — un écart
 * qu'on ne perçoit pas, donc une hiérarchie qui n'existait pas.
 *
 * Les interlignes sont fixés ici plutôt que laissés au système : sur un texte
 * clair posé sur fond sombre, l'œil a besoin d'un peu plus d'air.
 */
export const TYPE = {
  /** Métadonnées, notes de bas de bloc, compteurs. */
  caption: {fontSize: 12, lineHeight: 17},
  /** Texte courant d'une liste ou d'une fiche. */
  body: {fontSize: 14, lineHeight: 20},
  /** Intitulé d'élément, valeur mise en avant. */
  base: {fontSize: 17, lineHeight: 23},
  /** Titre d'écran. */
  title: {fontSize: 21, lineHeight: 27},
  /** Chiffre clé — compteur de tuile, total d'un KPI. */
  headline: {fontSize: 26, lineHeight: 31},
  /** Réservé à l'écran de connexion. */
  display: {fontSize: 40, lineHeight: 46},
} as const;

/** Toutes les tailles autorisées, pour le test qui interdit les valeurs hors échelle. */
export const TYPE_SIZES: readonly number[] = Object.values(TYPE).map(t => t.fontSize);

/**
 * Hauteur minimale d'une cible tactile — Human Interface Guidelines d'Apple.
 *
 * Relevé avant correction : de 17 pt (les actions de la file de synchro) à
 * 33 pt (les puces de filtre). Pour une application manipulée debout, en
 * mouvement, parfois avec des gants, c'est la contrainte la plus concrète du
 * cahier des charges.
 */
export const TOUCH_MIN = 44;

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

/**
 * Palette des contrôles superposés à l'aperçu caméra.
 *
 * Partout ailleurs, une couleur de texte suppose un fond connu — celui du
 * thème. Au-dessus de la caméra, le fond est l'image filmée : un hangar sans
 * lumière, un mur blanc en plein soleil, et tout l'intervalle entre les deux.
 * Suivre le thème y produit un défaut visible : en clair, `text` vaut presque
 * noir et disparaît sur le voile sombre des boutons de mode.
 *
 * Ces valeurs sont donc FIXES, indépendantes du thème choisi, et vérifiées par
 * `contrast.test.ts` : chacune garde un rapport d'au moins 4,5:1 sur le voile,
 * qu'il soit composé sur du noir ou sur du blanc.
 */
export const OVERLAY = {
  /** Voile posé derrière les contrôles. Séparé en couleur + alpha pour être testable. */
  scrimColor: '#0f172a',
  scrimAlpha: 0.82,
  scrim: 'rgba(15,23,42,0.82)',
  scrimStrong: 'rgba(15,23,42,0.93)',
  text: '#f8fafc',
  textMuted: '#dbe3ec',
  border: 'rgba(248,250,252,0.45)',
  warning: '#fbbf24',
  success: '#86efac',
  danger: '#fca5a5',
  /** Fond du mode sélectionné : assez foncé pour porter du texte blanc. */
  primary: '#0369a1',
  onPrimary: '#ffffff',
} as const;
