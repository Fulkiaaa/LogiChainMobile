import type {EventJSON, ZoneJSON} from '@/types/api';

import type {SqlDb} from './SqlDb';

export function createEventsRepo(db: SqlDb) {
  return {
    upsert(e: EventJSON): void {
      db.run(
        `INSERT INTO events (id,name,status,startsAt,endsAt,version,syncedAt)
         VALUES (?,?,?,?,?,?,datetime('now'))
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,status=excluded.status,
           startsAt=excluded.startsAt,endsAt=excluded.endsAt,version=excluded.version,syncedAt=datetime('now')`,
        [e.id, e.name, e.status, e.startsAt, e.endsAt, e.version],
      );
    },
    findById(id: string): EventJSON | null {
      return db.get<EventJSON>('SELECT * FROM events WHERE id=? LIMIT 1', [id]);
    },
  };
}

export function createZonesRepo(db: SqlDb) {
  return {
    upsertMany(zones: ZoneJSON[]): void {
      db.run('BEGIN');
      try {
        for (const z of zones) {
          db.run(
            `INSERT INTO zones (id,eventId,name,geojson,syncedAt)
             VALUES (?,?,?,?,datetime('now'))
             ON CONFLICT(id) DO UPDATE SET eventId=excluded.eventId,name=excluded.name,
               geojson=excluded.geojson,syncedAt=datetime('now')`,
            [z.id, z.eventId, z.name, JSON.stringify(z.geojson ?? null)],
          );
        }
        db.run('COMMIT');
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
    },
    listByEvent(eventId: string): ZoneJSON[] {
      return db.all<ZoneJSON>('SELECT * FROM zones WHERE eventId=?', [eventId]);
    },
  };
}

export type EventsRepo = ReturnType<typeof createEventsRepo>;
export type ZonesRepo = ReturnType<typeof createZonesRepo>;
