/**
 * Décide si une synchronisation doit partir d'elle-même.
 *
 * Le retour du réseau n'est pas le seul déclencheur : une action empilée alors
 * qu'on est DÉJÀ en ligne doit partir elle aussi, sinon elle attend un
 * changement de connectivité qui ne viendra jamais et l'utilisateur doit forcer
 * la synchro à la main.
 *
 * `freshCount` ne compte QUE les lignes `pending`, jamais les `failed` : le
 * flush réécrit l'outbox, donc déclencher sur « il reste quelque chose à
 * envoyer » relancerait indéfiniment une action que le serveur refuse. Une
 * ligne en échec attend le prochain retour de réseau ou un forçage manuel —
 * c'est le rôle du repli exponentiel, pas d'une boucle.
 */
export function shouldAutoSync(s: {
  online: boolean;
  freshCount: number;
  syncing: boolean;
}): boolean {
  return s.online && !s.syncing && s.freshCount > 0;
}
