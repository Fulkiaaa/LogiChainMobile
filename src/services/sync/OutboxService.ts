import {validateAnomalyNote, type ReportKind} from '@/domain/anomaly';
import {canTransition} from '@/domain/itemStateMachine';
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
        payload: {
          location: params.location,
          // Mémorisé pour pouvoir annuler l'affichage si la synchro échoue
          // définitivement (rollback visuel).
          ...(resolved.action.targetStatus ? {previousStatus: item.status} : {}),
        },
        now: params.now,
      });
      // Optimistic UI : applique tout de suite le statut cible en local.
      if (resolved.action.targetStatus) {
        deps.items.updateStatus(item.id, resolved.action.targetStatus, item.version);
      }
      deps.outbox.enqueue(row);
      return {ok: true};
    },

    /**
     * Signalement terrain : anomalie ou perte.
     *
     * L'anomalie n'altère pas le statut côté API (elle enrichit l'historique),
     * donc on ne touche pas au cache local. La perte, elle, est une transition
     * d'état : on l'applique de façon optimiste après l'avoir validée.
     */
    enqueueReport(params: {
      localId: string;
      itemId: string;
      kind: ReportKind;
      location: GeoPoint;
      note: string;
      now: string;
    }): EnqueueResult {
      const item = deps.items.findById(params.itemId);
      if (!item) {
        return {ok: false, reason: 'item absent du cache'};
      }

      const noteError = validateAnomalyNote(params.note, params.kind);
      if (noteError) {
        return {ok: false, reason: noteError};
      }

      if (params.kind === 'lost' && !canTransition(item.status, 'lost')) {
        return {ok: false, reason: `${item.status} → lost interdit`};
      }

      const row = buildOutboxRow({
        localId: params.localId,
        itemId: item.id,
        actionType: params.kind,
        baseVersion: item.version,
        payload: {
          location: params.location,
          note: params.note.trim(),
          // Seule la perte change le statut : elle seule a quelque chose à annuler.
          ...(params.kind === 'lost' ? {previousStatus: item.status} : {}),
        },
        now: params.now,
      });

      if (params.kind === 'lost') {
        deps.items.updateStatus(item.id, 'lost', item.version);
      }
      deps.outbox.enqueue(row);
      return {ok: true};
    },

    /**
     * Rollback visuel : restaure le statut que l'équipement avait avant
     * l'action optimiste. Sans effet si l'action n'en avait pas modifié
     * (anomalie, pointage) — la fonction est donc sûre à appeler sur
     * n'importe quelle ligne.
     */
    rollbackRow(row: OutboxRow): void {
      let previous: ItemStatus | undefined;
      try {
        previous = (JSON.parse(row.payload) as {previousStatus?: ItemStatus}).previousStatus;
      } catch {
        return; // payload illisible : on ne touche à rien
      }
      if (!previous) {
        return;
      }
      const item = deps.items.findById(row.entityId);
      if (item) {
        deps.items.updateStatus(item.id, previous, item.version);
      }
    },
  };
}

export type OutboxService = ReturnType<typeof createOutboxService>;
