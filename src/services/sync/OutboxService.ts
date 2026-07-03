import {resolveScanAction, type ScanMode} from '@/domain/scanAction';
import type {CachedItem} from '@/services/db/items.repo';
import type {OutboxActionType, OutboxRow} from '@/services/db/outbox.repo';
import type {GeoPoint, ItemStatus} from '@/types/api';

/** Construit une ligne outbox (fonction pure, testable). */
export function buildOutboxRow(p: {
  localId: string;
  itemId: string;
  actionType: OutboxActionType;
  baseVersion: number | null;
  payload: unknown;
  now: string;
}): OutboxRow {
  return {
    localId: p.localId,
    createdAt: p.now,
    entityType: 'item',
    entityId: p.itemId,
    actionType: p.actionType,
    payload: JSON.stringify(p.payload),
    baseVersion: p.baseVersion,
    status: 'pending',
    attempts: 0,
    lastError: null,
  };
}

export interface OutboxDeps {
  items: {
    findById(id: string): CachedItem | null;
    updateStatus(id: string, status: ItemStatus, version: number): void;
  };
  outbox: {enqueue(r: OutboxRow): void};
}

export type EnqueueResult = {ok: true} | {ok: false; reason: string};

/**
 * Encapsule l'empilement d'une action terrain : validation via la machine à
 * états, application optimiste du statut local, puis insertion dans l'outbox.
 */
export function createOutboxService(deps: OutboxDeps) {
  return {
    enqueueScan(params: {
      localId: string;
      itemId: string;
      mode: ScanMode;
      location: GeoPoint;
      now: string;
    }): EnqueueResult {
      const item = deps.items.findById(params.itemId);
      if (!item) {
        return {ok: false, reason: 'item absent du cache'};
      }
      const resolved = resolveScanAction(params.mode, item.status);
      if (!resolved.ok) {
        return {ok: false, reason: resolved.reason};
      }
      const row = buildOutboxRow({
        localId: params.localId,
        itemId: item.id,
        actionType: resolved.action.actionType,
        baseVersion: item.version,
        payload: {location: params.location},
        now: params.now,
      });
      // Optimistic UI : applique tout de suite le statut cible en local.
      if (resolved.action.targetStatus) {
        deps.items.updateStatus(item.id, resolved.action.targetStatus, item.version);
      }
      deps.outbox.enqueue(row);
      return {ok: true};
    },
  };
}

export type OutboxService = ReturnType<typeof createOutboxService>;
