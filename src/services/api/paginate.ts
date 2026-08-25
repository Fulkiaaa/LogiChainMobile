import type {Paginated} from '@/types/api';

/**
 * Taille de page maximale acceptée par l'API : `listItemsQuerySchema` plafonne
 * `limit` à 100 (Zod), et `BaseRepository.list()` re-clampe côté serveur.
 * Demander plus ne sert donc à rien — il faut paginer.
 */
export const API_PAGE_SIZE = 100;

/**
 * Garde-fou : 50 pages × 100 = 5 000 enregistrements, très au-delà du
 * « milliers d'enregistrements » visé par le sujet. Au-delà, on considère que
 * l'API boucle (ou que le secteur est aberrant) et on refuse de continuer.
 */
const MAX_PAGES = 50;

export interface FetchAllPagesOptions<T> {
  /**
   * Clé d'unicité. L'API trie par `createdAt: -1` sans départage : deux
   * enregistrements créés dans la même milliseconde (cas du seed, qui fait un
   * `insertMany`) peuvent se recouvrir d'une page à l'autre. On dédoublonne.
   */
  keyOf?: (row: T) => string;
  maxPages?: number;
}

/**
 * Parcourt toutes les pages d'une collection paginée et renvoie l'ensemble.
 *
 * Fonction pure vis-à-vis du réseau : elle reçoit le `fetchPage` du module
 * appelant, ce qui la rend testable sans client HTTP ni Keychain.
 *
 * En cas de troncature (cap atteint), on **lève** plutôt que de renvoyer une
 * liste partielle : mettre en cache un secteur incomplet est pire qu'échouer,
 * l'agent croirait avoir tout son matériel.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
  options: FetchAllPagesOptions<T> = {},
): Promise<T[]> {
  const {keyOf, maxPages = MAX_PAGES} = options;
  const rows: T[] = [];
  const seen = new Set<string>();
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    if (page > maxPages) {
      throw new Error(
        `Pagination interrompue : plus de ${maxPages} pages (${maxPages * API_PAGE_SIZE} enregistrements).`,
      );
    }
    const res = await fetchPage(page);
    const batch = Array.isArray(res?.data) ? res.data : [];

    for (const row of batch) {
      if (!keyOf) {
        rows.push(row);
        continue;
      }
      const key = keyOf(row);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      rows.push(row);
    }

    // `totalPages` absent ou non exploitable (réponse d'erreur parsée en `{}`)
    // → on s'arrête sur la page courante plutôt que de boucler à l'aveugle.
    const declared = Number(res?.totalPages);
    totalPages = Number.isFinite(declared) && declared > 0 ? declared : page;

    // Page vide alors que l'API en annonce d'autres : on coupe court.
    if (batch.length === 0) {
      break;
    }
    page += 1;
  }

  return rows;
}
