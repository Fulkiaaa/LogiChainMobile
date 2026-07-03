import { decideReconcile } from '@/domain/reconcile';

test('2xx → success', () => expect(decideReconcile({ httpStatus: 200 })).toBe('success'));

test('409 → conflict', () => expect(decideReconcile({ httpStatus: 409 })).toBe('conflict'));

test('422 invalid_transition → conflict', () =>
  expect(decideReconcile({ httpStatus: 422, body: { error: 'item.invalid_transition' } })).toBe('conflict'));

test('500 → retry', () => expect(decideReconcile({ httpStatus: 500 })).toBe('retry'));
