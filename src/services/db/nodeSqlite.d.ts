/**
 * Déclaration ambiante minimale de node:sqlite (Node 22+), utilisée uniquement
 * par l'adaptateur de test. Le tsconfig React Native n'inclut pas @types/node ;
 * on déclare donc juste la surface consommée par les tests.
 */
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): {
      run(...params: unknown[]): {changes: number; lastInsertRowid: number};
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
    };
    close(): void;
  }
}
