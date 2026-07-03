import type {SqlDb} from './SqlDb';

/**
 * DDL du schéma local, exécuté dans l'ordre. Idempotent (IF NOT EXISTS) :
 * rejouable à chaque ouverture sans risque.
 */
export const MIGRATIONS: string[] = [
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, name TEXT, status TEXT,
     startsAt TEXT, endsAt TEXT, version INTEGER, syncedAt TEXT)`,
  `CREATE TABLE IF NOT EXISTS zones (id TEXT PRIMARY KEY, eventId TEXT, name TEXT,
     geojson TEXT, syncedAt TEXT)`,
  `CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, qrCode TEXT, label TEXT,
     category TEXT, status TEXT, eventId TEXT, lng REAL, lat REAL, weightKg REAL,
     version INTEGER, updatedAt TEXT, syncedAt TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_items_qrCode ON items(qrCode)`,
  `CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`,
  `CREATE INDEX IF NOT EXISTS idx_items_eventId ON items(eventId)`,
  `CREATE TABLE IF NOT EXISTS outbox (localId TEXT PRIMARY KEY, createdAt TEXT NOT NULL,
     entityType TEXT NOT NULL, entityId TEXT NOT NULL, actionType TEXT NOT NULL,
     payload TEXT NOT NULL, baseVersion INTEGER, status TEXT NOT NULL,
     attempts INTEGER DEFAULT 0, lastError TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status)`,
  `CREATE TABLE IF NOT EXISTS sync_meta (key TEXT PRIMARY KEY, value TEXT)`,
];

/** Applique toutes les migrations sur le moteur fourni. */
export function runMigrations(db: SqlDb): void {
  for (const stmt of MIGRATIONS) {
    db.run(stmt);
  }
}
