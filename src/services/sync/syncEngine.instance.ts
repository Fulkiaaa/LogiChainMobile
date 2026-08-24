import {ENV} from '@/config/env';
import {itemsApi} from '@/services/api/items.api';
import {itemsRepo, outboxRepo} from '@/services/db/database';
import {fromItemJSON} from '@/services/db/items.repo';
import type {OutboxRow} from '@/services/db/outbox.repo';
import type {ApiOutcome} from '@/domain/reconcile';
import type {GeoPoint, ItemJSON} from '@/types/api';

import {createGuardedFlush} from './runFlush';
import {createSyncEngine} from './SyncEngine';
import {outboxService} from './outboxService.instance';

interface ScanPayload {
  location: GeoPoint;
  note?: string;
}

/** Route une ligne d'outbox vers l'endpoint API correspondant. */
async function sendAction(row: OutboxRow): Promise<ApiOutcome & {item?: ItemJSON}> {
  const p = JSON.parse(row.payload) as ScanPayload;
  let res: {status: number; data: ItemJSON};
  switch (row.actionType) {
    case 'deploy':
      res = await itemsApi.deploy(row.entityId, {location: p.location});
      break;
    case 'transit':
      res = await itemsApi.transit(row.entityId, {location: p.location});
      break;
    case 'anomaly':
      res = await itemsApi.anomaly(row.entityId, {location: p.location, note: p.note ?? ''});
      break;
    case 'lost':
      // Sans ce cas, 'lost' tombait dans le default et appelait /scan.
      res = await itemsApi.lost(row.entityId, p.note ? {note: p.note} : {});
      break;
    default:
      res = await itemsApi.scan(row.entityId, {location: p.location, note: p.note});
  }
  const ok = res.status >= 200 && res.status < 300;
  return {
    httpStatus: res.status,
    body: ok ? undefined : (res.data as unknown as {error?: string}),
    item: ok ? res.data : undefined,
  };
}

/** Moteur de sync réel, câblé sur l'API et le SQLite de production. */
export const syncEngine = createSyncEngine({
  maxAttempts: ENV.SYNC_MAX_ATTEMPTS,
  outbox: outboxRepo,
  sendAction,
  rollback: row => outboxService.rollbackRow(row),
  applyServerItem: (item: ItemJSON) => itemsRepo.upsertMany([fromItemJSON(item)]),
});

/** Flush applicatif unique, protégé contre les déclenchements concurrents. */
export const runFlush = createGuardedFlush(() => syncEngine.flush());
