import {ITEM_STATUSES, type ItemCategory, type ItemStatus} from '@/types/api';

/** Champs strictement nécessaires au filtrage — pas besoin d'un CachedItem complet. */
export interface FilterableItem {
  qrCode: string;
  label: string;
  status: ItemStatus;
  category: ItemCategory;
}

export interface ItemFilter {
  /** `null` = tous les statuts. */
  status: ItemStatus | null;
  query: string;
  /** `null` = toutes les catégories. */
  category: ItemCategory | null;
}

export type ItemSort = 'label' | 'status' | 'recent';

/** Tri appliqué tant que l'utilisateur n'a rien choisi. */
export const DEFAULT_SORT: ItemSort = 'label';

/** Le tri lit `updatedAt`, que le filtrage n'utilise pas : deux besoins, deux formes. */
export interface SortableItem {
  label: string;
  status: ItemStatus;
  updatedAt: string;
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
    if (filter.category !== null && item.category !== filter.category) {
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

/**
 * Rang du statut dans le cycle de vie du matériel :
 * en stock → alloué → en transit → déployé → maintenance → perdu.
 * `ITEM_STATUSES` porte déjà cet ordre, on s'appuie dessus plutôt que d'en
 * recopier un second qui finirait par diverger. Trier alphabétiquement n'aurait
 * aucun sens métier : « alloué » viendrait avant « en stock ».
 */
const rangStatut = (s: ItemStatus): number => ITEM_STATUSES.indexOf(s);

/** Ordonne une copie de la liste. Ne mute jamais l'entrée. */
export function sortItems<T extends SortableItem>(items: T[], sort: ItemSort): T[] {
  const copie = [...items];
  switch (sort) {
    case 'label':
      // Comparaison sur la forme normalisée : « Enceinte façade » se classe
      // comme « enceinte facade », sinon les accents cassent l'ordre attendu.
      return copie.sort((a, b) =>
        normalizeSearch(a.label).localeCompare(normalizeSearch(b.label)),
      );
    case 'status':
      return copie.sort((a, b) => rangStatut(a.status) - rangStatut(b.status));
    case 'recent':
      // Du plus récemment mis à jour au plus ancien : c'est ce qui vient de
      // bouger sur le terrain qui intéresse l'agent.
      return copie.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

/**
 * Nombre de réglages actifs dans le panneau de filtres, pour la pastille du
 * bouton. La recherche en est exclue : elle a déjà son propre affichage dans la
 * barre, la pastille ne doit signaler que ce qui est masqué dans le panneau.
 */
export function activeFilterCount(f: {category: ItemCategory | null; sort: ItemSort}): number {
  return (f.category !== null ? 1 : 0) + (f.sort !== DEFAULT_SORT ? 1 : 0);
}
