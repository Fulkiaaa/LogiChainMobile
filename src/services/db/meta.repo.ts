import type {SqlDb} from './SqlDb';

export function createMetaRepo(db: SqlDb) {
  return {
    get(key: string): string | null {
      const row = db.get<{value: string}>('SELECT value FROM sync_meta WHERE key=?', [key]);
      return row?.value ?? null;
    },
    set(key: string, value: string): void {
      db.run(
        `INSERT INTO sync_meta (key,value) VALUES (?,?)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [key, value],
      );
    },
  };
}

export type MetaRepo = ReturnType<typeof createMetaRepo>;
