import {eventsApi} from '@/services/api/events.api';
import {itemsApi} from '@/services/api/items.api';
import {eventsRepo, itemsRepo, metaRepo, zonesRepo} from '@/services/db/database';
import {fromItemJSON} from '@/services/db/items.repo';

export interface InitialSyncResult {
  eventId: string;
  itemCount: number;
}

/**
 * Onboarding : télécharge le secteur assigné (1er événement actif + ses zones
 * embarquées + ses items) et le met en cache local. Écrit les méta de synchro.
 */
export async function runInitialSync(): Promise<InitialSyncResult> {
  const events = await eventsApi.list();
  const ev = events.find(e => e.status === 'active') ?? events[0];
  if (!ev) {
    return {eventId: '', itemCount: 0};
  }
  eventsRepo.upsert(ev);
  zonesRepo.replaceForEvent(ev.id, ev.zones);

  const items = await itemsApi.listByEvent(ev.id);
  itemsRepo.upsertMany(items.map(fromItemJSON));

  metaRepo.set('assignedEventId', ev.id);
  metaRepo.set('lastFullSyncAt', new Date().toISOString());
  return {eventId: ev.id, itemCount: items.length};
}
