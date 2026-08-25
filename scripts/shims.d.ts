/**
 * Déclarations minimales pour `scripts/generate-qr.ts`, qui tourne sous Node
 * et non dans React Native.
 *
 * Même approche que `src/services/db/nodeSqlite.d.ts` : on décrit uniquement ce
 * qu'on utilise, plutôt que d'ajouter `@types/node` et `@types/qrcode` à un
 * projet mobile qui n'en a pas besoin ailleurs.
 *
 * Seules les DÉCLARATIONS DE MODULES vivent ici. `process` et `console` sont
 * déclarés dans le script lui-même : globaux, ils seraient visibles depuis le
 * code de l'application, où `process` n'existe pas à l'exécution — tsc laisserait
 * alors passer une erreur qui ne se verrait qu'en plein scan.
 */

declare module 'qrcode' {
  export interface QRCodeToStringOptions {
    type?: 'svg' | 'utf8' | 'terminal';
    margin?: number;
    /** Niveau de correction d'erreur : L (7 %) … H (30 %). */
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    width?: number;
    color?: {dark?: string; light?: string};
  }

  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
}

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
}

declare module 'node:path' {
  export function resolve(...segments: string[]): string;
}
