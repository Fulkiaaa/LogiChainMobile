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

/**
 * Traduit un conflit — le serveur détient un état incompatible avec l'action.
 *
 * Distinct de `explainSyncError` : un conflit n'est pas un échec technique, il
 * appelle un arbitrage humain. Le message doit donc nommer la cause *et* les
 * deux issues offertes juste en dessous (Rejouer / Abandonner). Seuls 409 et
 * 422 arrivent ici — ce sont les deux seuls codes que `decideReconcile`
 * route vers « conflict ».
 */
export function explainSyncConflict(lastError: string | null | undefined): string {
  const code = Number(/HTTP (\d{3})/.exec(lastError ?? '')?.[1] ?? NaN);

  if (code === 422) {
    return 'Un autre agent a déjà enregistré un geste sur cet équipement : le vôtre ne correspond plus à son état. Vérifiez sur place, puis rejouez ou abandonnez.';
  }
  if (code === 409) {
    return 'L’équipement a été modifié entre-temps sur le serveur. Rejouez pour repartir de l’état à jour, ou abandonnez.';
  }
  return lastError ?? 'Conflit avec l’état du serveur.';
}
