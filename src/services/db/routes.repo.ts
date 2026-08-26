import type {RouteJSON, RouteStop} from '@/types/api';

import {changeBus} from '@/services/store/changeBus';
import type {SqlDb} from './SqlDb';

/**
 * Ligne SQLite d'une tournée. Les étapes sont **imbriquées en JSON**, comme la
 * géométrie des zones : on ne les lit jamais séparément de leur tournée, et
 * une table dédiée n'apporterait qu'une jointure à chaque lecture.
 * C'est la même dénormalisation assumée que côté MongoDB.
 */
interface RouteRow {
  id: string;
  eventId: string;
  reference: string;
  mode: string;
  status: string;
  plannedDistanceKm: number;
  actualDistanceKm: number | null;
  totalWeightKg: number;
  stops: string;
  version: number;
}

const toRow = (r: RouteJSON) => [
  r.id, r.eventId, r.reference, r.mode, r.status,
  r.plannedDistanceKm, r.actualDistanceKm, r.totalWeightKg,
  JSON.stringify(r.stops), r.version,
];

/** Reconstruit la tournée. Des étapes illisibles valent liste vide, jamais une exception. */
function fromRow(row: RouteRow): RouteJSON {
  let stops: RouteStop[] = [];
  try {
    const parsed = JSON.parse(row.stops) as RouteStop[];
    if (Array.isArray(parsed)) {
      stops = parsed;
    }
  } catch {
    stops = [];
  }
  return {
    id: row.id,
    version: row.version ?? 0,
    createdAt: '',
    updatedAt: '',
    reference: row.reference,
    eventId: row.eventId,
    transporterId: '',
    mode: row.mode as RouteJSON['mode'],
    status: row.status as RouteJSON['status'],
    plannedDistanceKm: row.plannedDistanceKm,
    actualDistanceKm: row.actualDistanceKm,
    totalWeightKg: row.totalWeightKg,
    stops,
  };
}

export function createRoutesRepo(db: SqlDb) {
  return {
    upsertMany(routes: RouteJSON[]): void {
      db.run('BEGIN');
      try {
        for (const r of routes) {
          db.run(
            `INSERT INTO routes (id,eventId,reference,mode,status,plannedDistanceKm,
               actualDistanceKm,totalWeightKg,stops,version,syncedAt)
             VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))
             ON CONFLICT(id) DO UPDATE SET eventId=excluded.eventId,reference=excluded.reference,
               mode=excluded.mode,status=excluded.status,plannedDistanceKm=excluded.plannedDistanceKm,
               actualDistanceKm=excluded.actualDistanceKm,totalWeightKg=excluded.totalWeightKg,
               stops=excluded.stops,version=excluded.version,syncedAt=datetime('now')`,
            toRow(r),
          );
        }
        db.run('COMMIT');
      } catch (e) {
        db.run('ROLLBACK');
        throw e;
      }
      changeBus.emit('items');
    },

    listByEvent(eventId: string): RouteJSON[] {
      return db
        .all<RouteRow>('SELECT * FROM routes WHERE eventId=? ORDER BY reference', [eventId])
        .map(fromRow);
    },

    findById(id: string): RouteJSON | null {
      const row = db.get<RouteRow>('SELECT * FROM routes WHERE id=? LIMIT 1', [id]);
      return row ? fromRow(row) : null;
    },

    /** Purge totale, appelée au retéléchargement du secteur — même règle que les items. */
    deleteAll(): void {
      db.run('DELETE FROM routes');
      changeBus.emit('items');
    },
  };
}

export type RoutesRepo = ReturnType<typeof createRoutesRepo>;
