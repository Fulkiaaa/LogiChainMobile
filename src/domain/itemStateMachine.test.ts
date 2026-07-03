import { canTransition, assertTransition } from '@/domain/itemStateMachine';

test('transitions autorisées', () => {
  expect(canTransition('in_transit','deployed')).toBe(true);
  expect(canTransition('in_stock','deployed')).toBe(false);
  expect(canTransition('lost','in_stock')).toBe(false);
});

test('assertTransition jette sur transition interdite', () => {
  expect(() => assertTransition('in_stock','deployed')).toThrow();
});
