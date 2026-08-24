import type {ItemStatus} from '@/types/api';

/** Champs strictement nécessaires au filtrage — pas besoin d'un CachedItem complet. */
export interface FilterableItem {
  qrCode: string;
  label: string;
  status: ItemStatus;
}

export interface ItemFilter {
  /** `null` = tous les statuts. */
  status: ItemStatus | null;
  query: string;
}

/**
 * Minuscules sans accents, pour que « barriere » trouve « Barrière ».
 * `normalize` est disponible sur Hermes ; le garde-fou couvre un moteur qui
 * ne l'exposerait pas (la recherche reste alors sensible aux accents).
 */
export function normalizeSearch(s: string): string {
  const lowered = s.trim().toLowerCase();
  return typeof lowered.normalize === 'function'
    ? lowered.normalize('NFD').replace(/[̀-ͯ]/g, '')
    : lowered;
}

/** Filtre par statut ET par texte libre (QR ou libellé). Ne mute pas l'entrée. */
export function filterItems<T extends FilterableItem>(items: T[], filter: ItemFilter): T[] {
  const q = normalizeSearch(filter.query);

  return items.filter(item => {
    if (filter.status !== null && item.status !== filter.status) {
      return false;
    }
    if (q === '') {
      return true;
    }
    return (
      normalizeSearch(item.qrCode).includes(q) || normalizeSearch(item.label).includes(q)
    );
  });
}
