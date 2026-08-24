import {createChangeBus} from '@/services/store/changeBus';

test('notifie les abonnés du sujet émis', () => {
  const bus = createChangeBus();
  const vus: string[] = [];
  bus.subscribe('items', () => vus.push('a'));
  bus.subscribe('items', () => vus.push('b'));
  bus.emit('items');
  expect(vus).toEqual(['a', 'b']);
});

test('n’arrose pas les autres sujets', () => {
  const bus = createChangeBus();
  let items = 0;
  bus.subscribe('items', () => items++);
  bus.emit('outbox');
  expect(items).toBe(0);
});

test('se désabonne proprement (pas de fuite au démontage)', () => {
  const bus = createChangeBus();
  let n = 0;
  const off = bus.subscribe('items', () => n++);
  bus.emit('items');
  off();
  bus.emit('items');
  expect(n).toBe(1);
});

test('un abonné qui lève n’empêche pas les suivants d’être notifiés', () => {
  const bus = createChangeBus();
  const vus: string[] = [];
  bus.subscribe('items', () => {
    throw new Error('boom');
  });
  bus.subscribe('items', () => vus.push('survivant'));
  expect(() => bus.emit('items')).not.toThrow();
  expect(vus).toEqual(['survivant']);
});

test('émettre sans aucun abonné ne casse rien', () => {
  const bus = createChangeBus();
  expect(() => bus.emit('outbox')).not.toThrow();
});
