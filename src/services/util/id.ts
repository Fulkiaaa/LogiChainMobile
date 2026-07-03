let counter = 0;

/**
 * Identifiant local unique pour les lignes d'outbox et les zones sans id.
 * Suffisant pour un usage strictement local (pas besoin d'un vrai UUID
 * cryptographique, on évite ainsi la dépendance native de la lib uuid).
 */
export function makeId(prefix = 'loc'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${Math.floor(
    Math.random() * 1e9,
  ).toString(36)}`;
}
