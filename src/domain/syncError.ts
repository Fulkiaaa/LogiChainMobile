/**
 * Traduit l'erreur technique d'une action en échec en une phrase actionnable.
 *
 * Le centre de synchronisation affichait `HTTP 404` sans plus : l'utilisateur
 * voyait une action bloquée sans savoir ni pourquoi, ni quoi faire. Chaque cas
 * nomme donc la cause ET le geste qui débloque.
 */
export function explainSyncError(lastError: string | null | undefined): string {
  if (!lastError) {
    return 'Échec sans réponse du serveur : réseau probablement coupé.';
  }
  const code = Number(/HTTP (\d{3})/.exec(lastError)?.[1] ?? NaN);

  if (code === 404) {
    return 'Équipement inconnu du serveur. Le cache local vient d’une autre base : retéléchargez le secteur.';
  }
  if (code === 401 || code === 403) {
    return 'Session refusée. Déconnectez-vous et reconnectez-vous.';
  }
  if (code === 400 || code === 422) {
    return 'Action refusée par le serveur : elle ne correspond plus à l’état réel de l’équipement.';
  }
  if (code >= 500) {
    return 'Serveur indisponible. La synchro repartira au retour du réseau.';
  }
  return lastError;
}
