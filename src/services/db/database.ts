import {createEventsRepo, createZonesRepo} from './events.repo';
import {createItemsRepo} from './items.repo';
import {createMetaRepo} from './meta.repo';
import {createOutboxRepo} from './outbox.repo';
import {runMigrations} from './migrations';
import {createOpSqlDb, type SqlDb} from './SqlDb';

/**
 * Point d'entrée production de la couche DB (iPhone). Ouvre op-sqlite une seule
 * fois, applique les migrations, et expose les repositories liés au moteur réel.
 * Les tests n'importent PAS ce fichier : ils instancient les repos via leurs
 * factories avec l'adaptateur node:sqlite.
 */
let db: SqlDb | null = null;

export function getDb(): SqlDb {
  if (db) return db;
  db = createOpSqlDb('logichain.sqlite');
  db.run('PRAGMA journal_mode = WAL');
  runMigrations(db);
  return db;
}

export const itemsRepo = createItemsRepo(getDb());
export const outboxRepo = createOutboxRepo(getDb());
export const eventsRepo = createEventsRepo(getDb());
export const zonesRepo = createZonesRepo(getDb());
export const metaRepo = createMetaRepo(getDb());
