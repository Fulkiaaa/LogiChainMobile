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
  };
}

export type OutboxRepo = ReturnType<typeof createOutboxRepo>;
