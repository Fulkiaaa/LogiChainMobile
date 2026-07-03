import {makeId} from '@/services/util/id';
import type {EventJSON, EventStatus, EventZone, ZoneCategory} from '@/types/api';

import type {SqlDb} from './SqlDb';

/** Forme cachée d'un événement (strict nécessaire UI). */
export interface CachedEvent {
  id: string;
  name: string;
  slug: string;
  status: EventStatus;
  startDate: string;
  endDate: string;
  version: number;
}

/** Forme cachée d'une zone (dérivée de EventZone, aplatie). */
export interface CachedZone {
  id: string;
  eventId: string;
  name: string;
  category: ZoneCategory;
  area: string; // JSON PolygonGeometry
}

export function createEventsRepo(db: SqlDb) {
  return {
    upsert(e: EventJSON): void {
      db.run(
        `INSERT INTO events (id,name,slug,status,startDate,endDate,version,syncedAt)
         VALUES (?,?,?,?,?,?,?,datetime('now'))
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,status=excluded.status,
           startDate=excluded.startDate,endDate=excluded.endDate,version=excluded.version,syncedAt=datetime('now')`,
        [e.id, e.name, e.slug, e.status, e.startDate, e.endDate, e.version],
      );
    },
    findById(id: string): CachedEvent | null {
      return db.get<CachedEvent>('SELECT * FROM events WHERE id=? LIMIT 1', [id]);
    },
  };
}

export function createZonesRepo(db: SqlDb) {
  return {
    /** Remplace les zones d'un événement à partir des EventZone embarquées. */
    replaceForEvent(eventId: string, zones: EventZone[]): void {
      db.run('BEGIN');
      try {
        db.run('DELETE FROM zones WHERE eventId=?', [eventId]);
        for (const z of zones) {
          db.run(
            `INSERT INTO zones (id,eventId,name,category,area,syncedAt)
             VALUES (?,?,?,?,?,datetime('now'))`,
            [z.id ?? makeId('zone'), eventId, z.name, z.category, JSON.stringify(z.area)],
          );
        }
        db.run('COMMIT');
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    },
    listByEvent(eventId: string): CachedZone[] {
      return db.all<CachedZone>('SELECT * FROM zones WHERE eventId=?', [eventId]);
    },
  };
}

export type EventsRepo = ReturnType<typeof createEventsRepo>;
export type ZonesRepo = ReturnType<typeof createZonesRepo>;
