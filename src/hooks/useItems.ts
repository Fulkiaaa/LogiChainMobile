import {useCallback, useEffect, useMemo, useState} from 'react';

import {itemsRepo, metaRepo} from '@/services/db/database';
import {changeBus} from '@/services/store/changeBus';
import type {CachedItem} from '@/services/db/items.repo';
import type {ItemStatus} from '@/types/api';

export interface ItemsState {
  items: CachedItem[];
  byStatus: Record<string, number>;
  eventId: string | null;
  reload: () => void;
}

/** Lit les items du secteur assigné depuis le cache local (fonctionne hors-ligne). */
export function useItems(): ItemsState {
  const [items, setItems] = useState<CachedItem[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);

  const reload = useCallback(() => {
    const ev = metaRepo.get('assignedEventId');
    setEventId(ev);
    setItems(ev ? itemsRepo.listByEvent(ev) : []);
  }, []);

  useEffect(() => {
    reload();
    // Toute écriture locale (scan, perte, synchro) rafraîchit la liste sans
    // que l'utilisateur ait à tirer pour recharger.
    return changeBus.subscribe('items', reload);
  }, [reload]);

  // Sans useMemo : un parcours complet des items à chaque rendu du tableau de
  // bord — donc à chaque frappe dans la recherche — alors que seuls les
  // décomptes par statut nous intéressent, et qu'ils ne changent pas.
  const byStatus = useMemo(
    () =>
      items.reduce<Record<string, number>>((acc, it) => {
        acc[it.status] = (acc[it.status] ?? 0) + 1;
        return acc;
      }, {}),
    [items],
  );

  return {items, byStatus, eventId, reload};
}

export const ALL_STATUSES: ItemStatus[] = [
  'in_stock', 'allocated', 'in_transit', 'deployed', 'in_maintenance', 'lost',
];
