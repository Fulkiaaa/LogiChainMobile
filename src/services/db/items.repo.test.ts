import type {ItemJSON} from '@/types/api';

import {createItemsRepo, fromItemJSON, type CachedItem} from './items.repo';
import {runMigrations} from './migrations';
import {createNodeSqlDb} from './nodeSqlite.testadapter';

function freshRepo() {
  const db = createNodeSqlDb();
  runMigrations(db);
  return createItemsRepo(db);
}

const baseItem: CachedItem = {
  id: 'i1', qrCode: 'QR-1', label: 'Enceinte', category: 'sound', status: 'in_transit',
  eventId: 'e1', lng: 2.3, lat: 48.8, weightKg: 12, version: 1, updatedAt: '2026-07-03T00:00:00Z',
};

test('upsertMany puis findByQrCode retrouve l’item', () => {
  const repo = freshRepo();
  repo.upsertMany([baseItem]);
  const found = repo.findByQrCode('QR-1');
  expect(found?.id).toBe('i1');
  expect(found?.status).toBe('in_transit');
});

test('upsertMany est idempotent (upsert sur conflit d’id)', () => {
  const repo = freshRepo();
  repo.upsertMany([baseItem]);
  repo.upsertMany([{...baseItem, label: 'Enceinte v2', version: 2}]);
  const all = repo.listByEvent('e1');
  expect(all).toHaveLength(1);
  expect(all[0].label).toBe('Enceinte v2');
  expect(all[0].version).toBe(2);
});

test('updateStatus modifie statut et version (optimistic UI)', () => {
  const repo = freshRepo();
  repo.upsertMany([baseItem]);
  repo.updateStatus('i1', 'deployed', 1);
  expect(repo.findById('i1')?.status).toBe('deployed');
});

test('fromItemJSON extrait lng/lat depuis location et ignore l’historique', () => {
  const json = {
    id: 'i2', version: 3, createdAt: 'x', updatedAt: 'y', qrCode: 'QR-2', label: 'Projecteur',
    category: 'lighting', status: 'in_stock', eventId: null,
    location: {type: 'Point', coordinates: [1.1, 43.6]}, weightKg: 5,
    purchasePriceEur: 100, lifespanYears: 10, manufacturingCo2Kg: 50, history: [],
  } as ItemJSON;
  const cached = fromItemJSON(json);
  expect(cached.lng).toBe(1.1);
  expect(cached.lat).toBe(43.6);
  expect(cached).not.toHaveProperty('history');
  expect(cached).not.toHaveProperty('purchasePriceEur');
});

describe('résolution d’un QR quand deux bases se sont mélangées', () => {
  test('sans secteur, le QR en double reste ambigu — on ne veut pas de ce cas', () => {
    const repo = freshRepo();
    // Même code QR, deux identifiants : l'un vient d'un ancien seed, l'autre
    // de la base courante. C'est ce que produit un changement de cible API.
    repo.upsertMany([
      {...baseItem, id: 'ancien', eventId: 'event-perime', qrCode: 'LC-POWER-002'},
      {...baseItem, id: 'courant', eventId: 'event-actuel', qrCode: 'LC-POWER-002'},
    ]);
    expect(repo.listByEvent('event-actuel')).toHaveLength(1);
  });

  test('le scan résout dans le secteur assigné, jamais dans un résidu', () => {
    const repo = freshRepo();
    repo.upsertMany([
      {...baseItem, id: 'ancien', eventId: 'event-perime', qrCode: 'LC-POWER-002'},
      {...baseItem, id: 'courant', eventId: 'event-actuel', qrCode: 'LC-POWER-002'},
    ]);
    expect(repo.findByQrCode('LC-POWER-002', 'event-actuel')?.id).toBe('courant');
  });

  test('un QR hors du secteur assigné reste inconnu', () => {
    const repo = freshRepo();
    repo.upsertMany([{...baseItem, id: 'ancien', eventId: 'event-perime', qrCode: 'LC-POWER-002'}]);
    expect(repo.findByQrCode('LC-POWER-002', 'event-actuel')).toBeNull();
  });

  test('deleteAll vide le cache, y compris les items d’un autre secteur', () => {
    const repo = freshRepo();
    repo.upsertMany([
      {...baseItem, id: 'ancien', eventId: 'event-perime'},
      {...baseItem, id: 'courant', eventId: 'event-actuel'},
    ]);
    repo.deleteAll();
    expect(repo.listByEvent('event-actuel')).toHaveLength(0);
    expect(repo.findById('ancien')).toBeNull();
  });
});
