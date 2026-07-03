export type ApiOutcome = { httpStatus: number; body?: { error?: string } };

export type ReconcileDecision = 'success' | 'conflict' | 'retry';

export function decideReconcile(o: ApiOutcome): ReconcileDecision {
  if (o.httpStatus >= 200 && o.httpStatus < 300) return 'success';
  if (o.httpStatus === 409) return 'conflict';
  if (o.httpStatus === 422 && o.body?.error === 'item.invalid_transition') return 'conflict';
  return 'retry';
}
