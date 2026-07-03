import {useCallback, useEffect, useState} from 'react';

import {itemsRepo, metaRepo} from '@/services/db/database';
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
  }, [reload]);

  const byStatus = items.reduce<Record<string, number>>((acc, it) => {
    acc[it.status] = (acc[it.status] ?? 0) + 1;
    return acc;
  }, {});

  return {items, byStatus, eventId, reload};
}

export const ALL_STATUSES: ItemStatus[] = [
  'in_stock', 'allocated', 'in_transit', 'deployed', 'in_maintenance', 'lost',
];
