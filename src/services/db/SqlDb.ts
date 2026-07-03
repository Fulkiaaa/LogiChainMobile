/**
 * Abstraction minimale d'exécution SQL synchrone.
 *
 * Permet d'injecter le moteur : op-sqlite (production, iPhone) ou node:sqlite
 * (tests jest). Les repositories dépendent de cette interface, jamais d'un
 * moteur concret — ils sont donc testables hors natif.
 */
export interface SqlDb {
  /** Exécute une écriture (INSERT/UPDATE/DELETE/DDL/BEGIN/COMMIT). */
  run(sql: string, params?: ReadonlyArray<unknown>): void;
  /** Retourne la première ligne, ou null. */
  get<T = Record<string, unknown>>(sql: string, params?: ReadonlyArray<unknown>): T | null;
  /** Retourne toutes les lignes. */
  all<T = Record<string, unknown>>(sql: string, params?: ReadonlyArray<unknown>): T[];
  /** Exécute un script DDL multi-instructions (migrations). */
  exec(sql: string): void;
}

/**
 * Adaptateur op-sqlite (production). Utilise executeSync pour des lectures
 * synchrones (~1 ms) — clé de la réactivité au scan.
 */
export function createOpSqlDb(name = 'logichain.sqlite'): SqlDb {
  // Import paresseux : évite de charger le module natif hors application.
  const { open } = require('@op-engineering/op-sqlite');
  const db = open({ name });
  return {
    run(sql, params = []) {
      db.executeSync(sql, params as unknown[]);
    },
    get<T>(sql: string, params: ReadonlyArray<unknown> = []) {
      const res = db.executeSync(sql, params as unknown[]);
      return (res.rows?.[0] as T) ?? null;
    },
    all<T>(sql: string, params: ReadonlyArray<unknown> = []) {
      const res = db.executeSync(sql, params as unknown[]);
      return (res.rows as T[]) ?? [];
    },
    exec(sql) {
      for (const stmt of sql.split(';')) {
        const s = stmt.trim();
        if (s) db.executeSync(s);
      }
    },
  };
}
