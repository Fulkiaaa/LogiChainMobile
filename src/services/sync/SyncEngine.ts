import { decideReconcile, type ApiOutcome } from '@/domain/reconcile';
import { shouldGiveUp } from './backoff';

export interface SyncDeps {
  maxAttempts: number;
  outbox: { listPending(): any[]; remove(id: string): void; mark(id: string, s: string, e?: string): void };
  sendAction: (row: any) => Promise<ApiOutcome & { item?: any }>;
  applyServerItem: (item: any) => void;
  /**
   * Annule l'effet optimiste d'une action définitivement perdue. Optionnel :
   * une action sans effet local (ex. un pointage) n'a rien à annuler.
   */
  rollback?: (row: any) => void;
}

export interface FlushResult {
  synced: number;
  conflicts: number;
  failed: number;
  /** Actions abandonnées après épuisement des tentatives, et dont l'UI a été remise d'aplomb. */
  rolledBack: number;
}

export function createSyncEngine(deps: SyncDeps) {
  async function flush(): Promise<FlushResult> {
    let synced = 0, conflicts = 0, failed = 0, rolledBack = 0;

    for (const row of deps.outbox.listPending()) {
      const outcome = await deps.sendAction(row);
      const decision = decideReconcile(outcome);

      if (decision === 'success') {
        if (outcome.item) deps.applyServerItem(outcome.item);
        deps.outbox.remove(row.localId); synced++;
        continue;
      }

      if (decision === 'conflict') {
        // Le serveur détient une vérité différente : on laisse l'utilisateur
        // arbitrer (rejouer ou abandonner) plutôt que de décider à sa place.
        deps.outbox.mark(row.localId, 'conflict'); conflicts++;
        continue;
      }

      const nextAttempts = (row.attempts ?? 0) + 1;
      if (shouldGiveUp(nextAttempts, deps.maxAttempts)) {
        // Échec définitif : l'UI ne doit plus montrer un état que le serveur
        // n'a jamais accepté.
        deps.rollback?.(row);
        deps.outbox.remove(row.localId);
        rolledBack++;
      } else {
        deps.outbox.mark(row.localId, 'failed', `HTTP ${outcome.httpStatus}`);
        failed++;
      }
    }

    return { synced, conflicts, failed, rolledBack };
  }

  return { flush };
}
