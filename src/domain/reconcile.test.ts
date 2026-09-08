import { decideReconcile } from '@/domain/reconcile';

/**
 * Corps réellement renvoyé par l'API pour une transition interdite
 * (`BusinessRuleError` sérialisée par le middleware d'erreur). L'ancien test
 * inventait un `{error: 'item.invalid_transition'}` plat que l'API ne produit
 * pas : il passait au vert alors que tous les 422 partaient en réessai.
 */
const INVALID_TRANSITION_422 = {
  error: {
    code: 'BUSINESS_RULE_VIOLATION',
    message: 'Transition interdite : deployed → deployed',
    details: {
      rule: 'item.invalid_transition',
      from: 'deployed',
      to: 'deployed',
      allowed: ['in_transit', 'in_maintenance', 'lost', 'in_stock'],
    },
  },
};

test('2xx → success', () => expect(decideReconcile({ httpStatus: 200 })).toBe('success'));

test('409 → conflict', () => expect(decideReconcile({ httpStatus: 409 })).toBe('conflict'));

test('422 invalid_transition (corps réel de l’API) → conflict', () =>
  expect(decideReconcile({ httpStatus: 422, body: INVALID_TRANSITION_422 })).toBe('conflict'));

test('422 d’une autre règle métier → retry', () =>
  expect(
    decideReconcile({
      httpStatus: 422,
      body: { error: { code: 'BUSINESS_RULE_VIOLATION', details: { rule: 'item.empty_allocation' } } },
    }),
  ).toBe('retry'));

test('422 sans corps exploitable → retry', () =>
  expect(decideReconcile({ httpStatus: 422 })).toBe('retry'));

test('500 → retry', () => expect(decideReconcile({ httpStatus: 500 })).toBe('retry'));
