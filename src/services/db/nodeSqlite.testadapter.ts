/**
 * Adaptateur SqlDb basé sur node:sqlite (Node 22+). RÉSERVÉ AUX TESTS jest —
 * ce fichier n'est importé que par des *.test.ts et n'entre jamais dans le
 * bundle React Native (Metro ne le traverse pas).
 */
import {DatabaseSync} from 'node:sqlite';

import type {SqlDb} from './SqlDb';

export function createNodeSqlDb(): SqlDb {
  const db = new DatabaseSync(':memory:');
  return {
    run(sql, params = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    get(sql, params = []) {
      return (db.prepare(sql).get(...(params as never[])) as never) ?? null;
    },
    all(sql, params = []) {
      return db.prepare(sql).all(...(params as never[])) as never;
    },
    exec(sql) {
      db.exec(sql);
    },
  };
}
