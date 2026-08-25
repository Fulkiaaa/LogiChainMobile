import type {ItemCategory, ItemJSON, ItemStatus} from '@/types/api';

import {changeBus} from '@/services/store/changeBus';

import type {SqlDb} from './SqlDb';

export interface CachedItem {
  id: string;
  qrCode: string;
  label: string;
  category: ItemCategory;
  status: ItemStatus;
  eventId: string | null;
  lng: number | null;
  lat: number | null;
  weightKg: number;
  version: number;
  updatedAt: string;
}

/** Projette un ItemJSON de l'API vers la forme mise en cache (strict nécessaire UI). */
export function fromItemJSON(i: ItemJSON): CachedItem {
  return {
    id: i.id,
    qrCode: i.qrCode,
    label: i.label,
    category: i.category,
    status: i.status,
    eventId: i.eventId,
    lng: i.location?.coordinates[0] ?? null,
    lat: i.location?.coordinates[1] ?? null,
    weightKg: i.weightKg,
    version: i.version,
    updatedAt: i.updatedAt,
  };
}

export function createItemsRepo(db: SqlDb) {
  return {
    upsertMany(items: CachedItem[]): void {
      db.run('BEGIN');
      try {
        for (const it of items) {
          db.run(
            `INSERT INTO items (id,qrCode,label,category,status,eventId,lng,lat,weightKg,version,updatedAt,syncedAt)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
             ON CONFLICT(id) DO UPDATE SET qrCode=excluded.qrCode,label=excluded.label,category=excluded.category,
               status=excluded.status,eventId=excluded.eventId,lng=excluded.lng,lat=excluded.lat,
               weightKg=excluded.weightKg,version=excluded.version,updatedAt=excluded.updatedAt,syncedAt=datetime('now')`,
            [
              it.id, it.qrCode, it.label, it.category, it.status, it.eventId,
              it.lng, it.lat, it.weightKg, it.version, it.updatedAt,
            ],
          );
        }
        db.run('COMMIT');
        changeBus.emit('items');
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    },
    /**
     * Résolution d'un code QR, restreinte au secteur assigné quand il est
     * connu.
     *
     * Sans ce filtre, deux items venus de bases différentes (changement de
     * cible API, seed rejoué) partagent le même `qrCode` sans partager leur
     * `id` : `LIMIT 1` renvoyait alors l'un ou l'autre sans ordre garanti, et
     * un scan pouvait viser un équipement que le serveur ne connaît pas — 404
     * à la synchro, action bloquée en file, sans explication à l'écran.
     *
     * Le filtre dit aussi la règle métier : un agent ne scanne que le matériel
     * de son secteur.
     */
    findByQrCode(qr: string, eventId?: string | null): CachedItem | null {
      if (eventId) {
        return db.get<CachedItem>(
          'SELECT * FROM items WHERE qrCode=? AND eventId=? LIMIT 1',
          [qr, eventId],
        );
      }
      return db.get<CachedItem>('SELECT * FROM items WHERE qrCode=? LIMIT 1', [qr]);
    },
    findById(id: string): CachedItem | null {
      return db.get<CachedItem>('SELECT * FROM items WHERE id=? LIMIT 1', [id]);
    },
    updateStatus(id: string, status: ItemStatus, version: number): void {
      db.run('UPDATE items SET status=?, version=? WHERE id=?', [status, version, id]);
      changeBus.emit('items');
    },
    /**
     * Vide entièrement le cache d'équipements.
     *
     * `deleteByEvent` ne retire que le secteur nommé : tout résidu rattaché à
     * un autre événement — ou à une autre base — lui survit. Un
     * retéléchargement du secteur doit repartir d'une table vide, sinon deux
     * générations de données cohabitent.
     */
    deleteAll(): void {
      db.run('DELETE FROM items');
      changeBus.emit('items');
    },
    /** Purge les items d'un secteur qu'on quitte (réaffectation d'agent). */
    deleteByEvent(eventId: string): void {
      db.run('DELETE FROM items WHERE eventId=?', [eventId]);
      changeBus.emit('items');
    },
    listByEvent(eventId: string): CachedItem[] {
      return db.all<CachedItem>('SELECT * FROM items WHERE eventId=? ORDER BY label', [eventId]);
    },
  };
}

export type ItemsRepo = ReturnType<typeof createItemsRepo>;
