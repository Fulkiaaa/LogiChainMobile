import type { ItemStatus } from '@/types/api';

export const ALLOWED_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  in_stock: ['allocated','in_maintenance','lost'],
  allocated: ['in_transit','in_stock','lost'],
  in_transit: ['deployed','lost','in_stock'],
  deployed: ['in_transit','in_maintenance','lost','in_stock'],
  in_maintenance: ['in_stock','lost'],
  lost: [],
};

export class InvalidTransitionError extends Error {
  constructor(public from: ItemStatus, public to: ItemStatus) {
    super(`Transition interdite : ${from} → ${to}`);
  }
}

export const canTransition = (from: ItemStatus, to: ItemStatus): boolean =>
  ALLOWED_TRANSITIONS[from].includes(to);

export function assertTransition(from: ItemStatus, to: ItemStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
}
