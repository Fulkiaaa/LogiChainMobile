import type { ItemStatus } from '@/types/api';
import { canTransition } from '@/domain/itemStateMachine';

export type ScanMode = 'deploy' | 'transit' | 'pointage';

export type OutboxAction = { actionType: 'deploy'|'transit'|'scan'; targetStatus?: ItemStatus };

const MODE_TARGET: Record<Exclude<ScanMode,'pointage'>, ItemStatus> =
  { deploy: 'deployed', transit: 'in_transit' };

export function resolveScanAction(mode: ScanMode, currentStatus: ItemStatus) {
  if (mode === 'pointage') return { ok: true as const, action: { actionType: 'scan' as const } };
  const target = MODE_TARGET[mode];
  if (!canTransition(currentStatus, target))
    return { ok: false as const, reason: `${currentStatus} → ${target} interdit` };
  return { ok: true as const, action: { actionType: mode, targetStatus: target } };
}
