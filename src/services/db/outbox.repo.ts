import {changeBus} from '@/services/store/changeBus';

import type {SqlDb} from './SqlDb';

export type OutboxStatus = 'pending' | 'syncing' | 'failed' | 'conflict';
export type OutboxActionType =
  | 'scan' | 'transit' | 'deploy' | 'anomaly' | 'lost' | 'maintenance' | 'allocate' | 'return';

export interface OutboxRow {
  localId: string;
  createdAt: string;
  entityType: 'item';
  entityId: string;
  actionType: OutboxActionType;
  payload: string;
  baseVersion: number | null;
  status: OutboxStatus;
  attempts: number;
  lastError?: string | null;
}

export function createOutboxRepo(db: SqlDb) {
  return {
    enqueue(r: OutboxRow): void {
      db.run(
        `INSERT INTO outbox (localId,createdAt,entityType,entityId,actionType,payload,baseVersion,status,attempts,lastError)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          r.localId, r.createdAt, r.entityType, r.entityId, r.actionType,
          r.payload, r.baseVersion, r.status, r.attempts, r.lastError ?? null,
        ],
      );
      changeBus.emit('outbox');
    },
    listPending(): OutboxRow[] {
      return db.all<OutboxRow>(
        "SELECT * FROM outbox WHERE status IN ('pending','failed') ORDER BY createdAt",
      );
    },
    listConflicts(): OutboxRow[] {
      return db.all<OutboxRow>("SELECT * FROM outbox WHERE status='conflict' ORDER BY createdAt");
    },
    remove(localId: string): void {
      db.run('DELETE FROM outbox WHERE localId=?', [localId]);
      changeBus.emit('outbox');
    },
    mark(localId: string, status: OutboxStatus, lastError?: string): void {
      db.run('UPDATE outbox SET status=?, attempts=attempts+1, lastError=? WHERE localId=?', [
        status, lastError ?? null, localId,
      ]);
      changeBus.emit('outbox');
    },
    countPending(): number {
      const row = db.get<{c: number}>(
        "SELECT COUNT(*) c FROM outbox WHERE status IN ('pending','failed')",
      );
      return row?.c ?? 0;
    },
    /**
     * Actions jamais tentées, ou dont la tentative précédente s'est bien
     * terminée. Sert de DÉCLENCHEUR à la synchro automatique, là où
     * `countPending` sert d'AFFICHAGE : une ligne `failed` reste à envoyer et
     * doit se voir, mais la relancer à chaque réécriture de l'outbox ferait
     * boucler la synchro sur une action que le serveur refuse.
     */
    countFresh(): number {
      const row = db.get<{c: number}>("SELECT COUNT(*) c FROM outbox WHERE status='pending'");
      return row?.c ?? 0;
    },
    /**
     * Vrai si cet équipement porte une action pas encore confirmée par le
     * serveur. La fiche s'en sert pour savoir laquelle des deux vérités
     * afficher : la sienne, ou celle du serveur qui ignore encore le geste.
     */
    hasPendingFor(entityId: string): boolean {
      const row = db.get<{c: number}>(
        "SELECT COUNT(*) c FROM outbox WHERE entityId=? AND status IN ('pending','failed')",
        [entityId],
      );
      return (row?.c ?? 0) > 0;
    },
  };
}

export type OutboxRepo = ReturnType<typeof createOutboxRepo>;
