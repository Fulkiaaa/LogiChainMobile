import {createRoutesRepo} from './routes.repo';
import {runMigrations} from './migrations';
import {createNodeSqlDb} from './nodeSqlite.testadapter';
import type {RouteJSON} from '@/types/api';

function freshRepo() {
  const db = createNodeSqlDb();
  runMigrations(db);
  return createRoutesRepo(db);
}

const ROUTE: RouteJSON = {
  id: 'r1', version: 0, createdAt: '', updatedAt: '',
  reference: 'RTE-2026-03', eventId: 'e1', transporterId: 't1',
  mode: 'rail', status: 'planned',
  plannedDistanceKm: 680, actualDistanceKm: null, totalWeightKg: 9800,
  stops: [{
    id: 's0', sequence: 0, label: 'Dépôt Toulouse', type: 'pickup',
    location: {type: 'Point', coordinates: [1.444, 43.6045]},
    scheduledAt: '2026-07-07T20:00:00.000Z', completedAt: null, itemIds: ['i1'],
  }],
};

test('une tournée survit à l’aller-retour SQLite, étapes comprises', () => {
  const repo = freshRepo();
  repo.upsertMany([ROUTE]);
  const [r] = repo.listByEvent('e1');
  expect(r?.reference).toBe('RTE-2026-03');
  expect(r?.stops).toHaveLength(1);
  expect(r?.stops[0]?.location.coordinates).toEqual([1.444, 43.6045]);
});

test('upsertMany est idempotent et met à jour la distance réelle', () => {
  const repo = freshRepo();
  repo.upsertMany([ROUTE]);
  repo.upsertMany([{...ROUTE, actualDistanceKm: 19.5, version: 1}]);
  const rows = repo.listByEvent('e1');
  expect(rows).toHaveLength(1);
  expect(rows[0]?.actualDistanceKm).toBe(19.5);
});

test('des étapes illisibles donnent une liste vide, pas une exception', () => {
  const db = createNodeSqlDb();
  runMigrations(db);
  const repo = createRoutesRepo(db);
  repo.upsertMany([ROUTE]);
  db.run("UPDATE routes SET stops='{pas du json' WHERE id='r1'");
  expect(repo.listByEvent('e1')[0]?.stops).toEqual([]);
});

test('deleteAll vide le cache des tournées', () => {
  const repo = freshRepo();
  repo.upsertMany([ROUTE]);
  repo.deleteAll();
  expect(repo.listByEvent('e1')).toHaveLength(0);
  expect(repo.findById('r1')).toBeNull();
});
