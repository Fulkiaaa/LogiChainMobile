import {createItemsRepo, type CachedItem} from '@/services/db/items.repo';
import {runMigrations} from '@/services/db/migrations';
import {createNodeSqlDb} from '@/services/db/nodeSqlite.testadapter';
import {createOutboxRepo} from '@/services/db/outbox.repo';

import type {GeoPoint} from '@/types/api';

import {buildOutboxRow, createOutboxService} from './OutboxService';

const loc: GeoPoint = {type: 'Point', coordinates: [2, 48]};

function fixture(status: CachedItem['status']) {
  const db = createNodeSqlDb();
  runMigrations(db);
  const items = createItemsRepo(db);
  const outbox = createOutboxRepo(db);
  items.upsertMany([
    {
      id: 'i1', qrCode: 'QR-1', label: 'X', category: 'sound', status,
      eventId: 'e1', lng: null, lat: null, weightKg: 1, version: 4, updatedAt: 'now',
    },
  ]);
  return {items, outbox, service: createOutboxService({items, outbox})};
}

test('buildOutboxRow produit une ligne pending avec baseVersion et payload', () => {
  const row = buildOutboxRow({
    localId: 'l1', itemId: 'i1', actionType: 'deploy', baseVersion: 3,
    payload: {location: loc}, now: '2026-07-03T00:00:00Z',
  });
  expect(row.status).toBe('pending');
  expect(row.baseVersion).toBe(3);
  expect(JSON.parse(row.payload).location.coordinates).toEqual([2, 48]);
});

test('enqueueScan (deploy sur in_transit) : enfile + applique le statut optimiste', () => {
  const {items, outbox, service} = fixture('in_transit');
  const res = service.enqueueScan({localId: 'l1', itemId: 'i1', mode: 'deploy', location: loc, now: 'now'});
  expect(res.ok).toBe(true);
  expect(outbox.countPending()).toBe(1);
  expect(items.findById('i1')?.status).toBe('deployed'); // optimistic UI
});

test('enqueueScan refusé si transition interdite : rien enfilé, statut inchangé', () => {
  const {items, outbox, service} = fixture('in_stock');
  const res = service.enqueueScan({localId: 'l1', itemId: 'i1', mode: 'deploy', location: loc, now: 'now'});
  expect(res.ok).toBe(false);
  expect(outbox.countPending()).toBe(0);
  expect(items.findById('i1')?.status).toBe('in_stock');
});

test('enqueueScan pointage : enfile un scan sans changer le statut', () => {
  const {items, outbox, service} = fixture('deployed');
  const res = service.enqueueScan({localId: 'l1', itemId: 'i1', mode: 'pointage', location: loc, now: 'now'});
  expect(res.ok).toBe(true);
  expect(outbox.countPending()).toBe(1);
  expect(outbox.listPending()[0].actionType).toBe('scan');
  expect(items.findById('i1')?.status).toBe('deployed');
});

test('enqueueScan sur item absent du cache : échec explicite', () => {
  const {service} = fixture('in_stock');
  const res = service.enqueueScan({localId: 'l1', itemId: 'absent', mode: 'pointage', location: loc, now: 'now'});
  expect(res.ok).toBe(false);
});

test('enqueueReport (anomaly) : enfile sans changer le statut de l’item', () => {
  const {items, outbox, service} = fixture('deployed');
  const res = service.enqueueReport({
    localId: 'a1', itemId: 'i1', kind: 'anomaly', location: loc,
    note: 'Pied tordu', now: 'now',
  });
  expect(res.ok).toBe(true);
  expect(outbox.countPending()).toBe(1);
  // L'API n'altère pas le statut sur une anomalie : le local ne doit pas bouger.
  expect(items.findById('i1')!.status).toBe('deployed');
  const row = outbox.listPending()[0];
  expect(row.actionType).toBe('anomaly');
  expect(JSON.parse(row.payload).note).toBe('Pied tordu');
});

test('enqueueReport (lost) : bascule le statut local en lost (optimistic UI)', () => {
  const {items, outbox, service} = fixture('deployed');
  const res = service.enqueueReport({
    localId: 'a2', itemId: 'i1', kind: 'lost', location: loc, note: '', now: 'now',
  });
  expect(res.ok).toBe(true);
  expect(items.findById('i1')!.status).toBe('lost');
  expect(outbox.listPending()[0].actionType).toBe('lost');
});

test('enqueueReport (lost) : refusé si la transition est interdite', () => {
  const {items, outbox, service} = fixture('lost'); // lost est terminal
  const res = service.enqueueReport({
    localId: 'a3', itemId: 'i1', kind: 'lost', location: loc, note: '', now: 'now',
  });
  expect(res.ok).toBe(false);
  expect(outbox.countPending()).toBe(0);
  expect(items.findById('i1')!.status).toBe('lost');
});

test('enqueueReport (anomaly) : refusé si la note est vide', () => {
  const {outbox, service} = fixture('deployed');
  const res = service.enqueueReport({
    localId: 'a4', itemId: 'i1', kind: 'anomaly', location: loc, note: '   ', now: 'now',
  });
  expect(res.ok).toBe(false);
  expect(outbox.countPending()).toBe(0);
});

test('enqueueReport : refusé si l’item est absent du cache', () => {
  const {service} = fixture('deployed');
  const res = service.enqueueReport({
    localId: 'a5', itemId: 'inconnu', kind: 'anomaly', location: loc, note: 'x', now: 'now',
  });
  expect(res.ok).toBe(false);
});

test('enqueueScan mémorise previousStatus pour permettre le rollback', () => {
  const {outbox, service} = fixture('in_transit');
  service.enqueueScan({localId: 'l9', itemId: 'i1', mode: 'deploy', location: loc, now: 'now'});
  expect(JSON.parse(outbox.listPending()[0].payload).previousStatus).toBe('in_transit');
});

test('enqueueReport (anomaly) ne mémorise PAS de previousStatus — rien à annuler', () => {
  const {outbox, service} = fixture('deployed');
  service.enqueueReport({localId: 'r9', itemId: 'i1', kind: 'anomaly', location: loc, note: 'x', now: 'now'});
  expect(JSON.parse(outbox.listPending()[0].payload).previousStatus).toBeUndefined();
});

test('rollbackRow restaure le statut d’avant l’action', () => {
  const {items, outbox, service} = fixture('in_transit');
  service.enqueueScan({localId: 'l10', itemId: 'i1', mode: 'deploy', location: loc, now: 'now'});
  expect(items.findById('i1')!.status).toBe('deployed'); // optimiste appliqué
  service.rollbackRow(outbox.listPending()[0]);
  expect(items.findById('i1')!.status).toBe('in_transit'); // remis d'aplomb
});

test('rollbackRow est sans effet quand il n’y a pas de previousStatus', () => {
  const {items, outbox, service} = fixture('deployed');
  service.enqueueReport({localId: 'r10', itemId: 'i1', kind: 'anomaly', location: loc, note: 'x', now: 'now'});
  service.rollbackRow(outbox.listPending()[0]);
  expect(items.findById('i1')!.status).toBe('deployed');
});
