import { decideReconcile, type ApiOutcome } from '@/domain/reconcile';
import { shouldGiveUp } from './backoff';
export interface SyncDeps {
  maxAttempts: number;
  outbox: { listPending(): any[]; remove(id: string): void; mark(id: string, s: string, e?: string): void };
  sendAction: (row: any) => Promise<ApiOutcome & { item?: any }>;
  applyServerItem: (item: any) => void;
}
export function createSyncEngine(deps: SyncDeps) {
  async function flush() {
    let synced = 0, conflicts = 0, failed = 0;
    for (const row of deps.outbox.listPending()) {
      const outcome = await deps.sendAction(row);
      const decision = decideReconcile(outcome);
      if (decision === 'success') {
        if (outcome.item) deps.applyServerItem(outcome.item);
        deps.outbox.remove(row.localId); synced++;
      } else if (decision === 'conflict') {
        deps.outbox.mark(row.localId, 'conflict'); conflicts++;
      } else {
        const nextAttempts = (row.attempts ?? 0) + 1;
        deps.outbox.mark(row.localId, shouldGiveUp(nextAttempts, deps.maxAttempts) ? 'conflict' : 'failed', `HTTP ${outcome.httpStatus}`);
        failed++;
      }
    }
    return { synced, conflicts, failed };
  }
  return { flush };
}
