import {createOutboxRepo, type OutboxRow} from './outbox.repo';
import {runMigrations} from './migrations';
import {createNodeSqlDb} from './nodeSqlite.testadapter';

function freshRepo() {
  const db = createNodeSqlDb();
  runMigrations(db);
  return createOutboxRepo(db);
}

function row(localId: string, createdAt: string): OutboxRow {
  return {
    localId, createdAt, entityType: 'item', entityId: 'i1', actionType: 'deploy',
    payload: '{"location":{"type":"Point","coordinates":[2,48]}}', baseVersion: 1,
    status: 'pending', attempts: 0, lastError: null,
  };
}

test('enqueue puis listPending renvoie la ligne', () => {
  const repo = freshRepo();
  repo.enqueue(row('a', '2026-07-03T00:00:00Z'));
  expect(repo.listPending()).toHaveLength(1);
  expect(repo.countPending()).toBe(1);
});

test('listPending est ordonné FIFO par createdAt', () => {
  const repo = freshRepo();
  repo.enqueue(row('b', '2026-07-03T00:00:02Z'));
  repo.enqueue(row('a', '2026-07-03T00:00:01Z'));
  expect(repo.listPending().map(r => r.localId)).toEqual(['a', 'b']);
});

test('remove vide la ligne après flush réussi', () => {
  const repo = freshRepo();
  repo.enqueue(row('a', '2026-07-03T00:00:00Z'));
  repo.remove('a');
  expect(repo.countPending()).toBe(0);
});

test('mark conflict retire de pending et alimente listConflicts', () => {
  const repo = freshRepo();
  repo.enqueue(row('a', '2026-07-03T00:00:00Z'));
  repo.mark('a', 'conflict', 'HTTP 409');
  expect(repo.countPending()).toBe(0);
  const conflicts = repo.listConflicts();
  expect(conflicts).toHaveLength(1);
  expect(conflicts[0].attempts).toBe(1);
  expect(conflicts[0].lastError).toBe('HTTP 409');
});

test('countFresh ignore les lignes en échec, countPending les compte', () => {
  const repo = freshRepo();
  repo.enqueue(row('a', '2026-07-03T00:00:01Z'));
  repo.enqueue(row('b', '2026-07-03T00:00:02Z'));
  repo.mark('a', 'failed', 'HTTP 503');
  // L'utilisateur doit voir 2 actions encore à envoyer…
  expect(repo.countPending()).toBe(2);
  // …mais une seule est « fraîche » : relancer la synchro sur celle en échec
  // la ferait boucler à chaque réécriture de l'outbox.
  expect(repo.countFresh()).toBe(1);
});

test('hasPendingFor répond par équipement', () => {
  const repo = freshRepo();
  repo.enqueue({...row('a', '2026-07-03T00:00:01Z'), entityId: 'item-42'});
  expect(repo.hasPendingFor('item-42')).toBe(true);
  expect(repo.hasPendingFor('item-99')).toBe(false);
});

test('hasPendingFor reste vrai tant que l’action est en échec, faux une fois confirmée', () => {
  const repo = freshRepo();
  repo.enqueue({...row('a', '2026-07-03T00:00:01Z'), entityId: 'item-42'});
  repo.mark('a', 'failed', 'HTTP 503');
  expect(repo.hasPendingFor('item-42')).toBe(true);
  repo.remove('a');
  expect(repo.hasPendingFor('item-42')).toBe(false);
});
