import {eventsApi} from '@/services/api/events.api';
import {itemsApi} from '@/services/api/items.api';
import {routesApi} from '@/services/api/routes.api';
import {eventsRepo, itemsRepo, metaRepo, routesRepo, zonesRepo} from '@/services/db/database';
import {fromItemJSON} from '@/services/db/items.repo';

export interface InitialSyncResult {
  eventId: string;
  itemCount: number;
  routeCount: number;
}

/**
 * Onboarding : télécharge le secteur assigné (1er événement actif + ses zones
 * embarquées + ses items) et le met en cache local. Écrit les méta de synchro.
 */
export async function runInitialSync(): Promise<InitialSyncResult> {
  const events = await eventsApi.list();
  const ev = events.find(e => e.status === 'active') ?? events[0];
  if (!ev) {
    return {eventId: '', itemCount: 0, routeCount: 0};
  }
  eventsRepo.upsert(ev);
  zonesRepo.replaceForEvent(ev.id, ev.zones);

  const items = await itemsApi.listByEvent(ev.id);
  itemsRepo.upsertMany(items.map(fromItemJSON));

  // Les tournées entrent dans le cache au même titre que les équipements :
  // une feuille de route se consulte en zone blanche, sur la route justement.
  const routes = await routesApi.listByEvent(ev.id);
  routesRepo.upsertMany(routes);

  metaRepo.set('assignedEventId', ev.id);
  metaRepo.set('lastFullSyncAt', new Date().toISOString());
  return {eventId: ev.id, itemCount: items.length, routeCount: routes.length};
}

/**
 * Retélécharge le secteur depuis zéro.
 *
 * `runInitialSync` n'est déclenchée qu'en l'absence de secteur en cache : sans
 * ce point d'entrée, un agent réaffecté à un autre événement resterait
 * indéfiniment sur l'ancien. On purge d'abord l'ancien secteur, sinon ses
 * items resteraient en base sans jamais être affichés ni nettoyés.
 */
export async function resyncSector(): Promise<InitialSyncResult> {
  const previous = metaRepo.get('assignedEventId');
  if (previous) {
    zonesRepo.replaceForEvent(previous, []);
  }
  /*
   * Purge TOTALE, pas seulement le secteur précédent : si un resync antérieur
   * s'est interrompu, ou si l'application a changé de base (cible API), des
   * items rattachés à un autre événement subsistent. Ils partagent les codes
   * QR de la base courante sans partager leurs identifiants — un scan pouvait
   * alors viser un équipement inexistant côté serveur.
   */
  itemsRepo.deleteAll();
  routesRepo.deleteAll();
  metaRepo.set('assignedEventId', '');
  return runInitialSync();
}
