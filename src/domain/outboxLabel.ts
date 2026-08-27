/**
 * Mise en mots de la file d'attente de synchronisation.
 *
 * Le centre de synchro est l'écran qui doit rassurer : « ton travail n'est pas
 * perdu ». Il affichait jusqu'ici les identifiants internes tels quels —
 * `scan · item A3F2E4`, un horodatage ISO — c'est-à-dire le vocabulaire de la
 * base de données, pas celui de l'agent qui vient de scanner un praticable.
 *
 * Ce module ne fait aucun accès aux données : il reçoit ce qui a déjà été lu,
 * et renvoie du texte. C'est ce qui le rend testable sans base SQLite.
 */
import type { OutboxActionType } from '@/services/db/outbox.repo';

/** Un libellé par geste métier. Ce sont les mots employés à l'oral sur le terrain. */
export const ACTION_LABELS: Record<OutboxActionType, string> = {
  scan: 'Pointage',
  transit: 'Mise en transit',
  deploy: 'Déploiement',
  anomaly: 'Signalement d’anomalie',
  lost: 'Déclaration de perte',
  maintenance: 'Mise en maintenance',
  allocate: 'Allocation',
  return: 'Retour en stock',
};

/**
 * Fin d'un identifiant, en majuscules — de quoi lire une référence à voix haute
 * au support sans dicter un UUID entier.
 */
export function shortRef(entityId: string): string {
  return entityId.slice(-6).toUpperCase();
}

/**
 * « Pointage · Praticable scène B ».
 *
 * `itemLabel` vient du cache local et peut manquer : une action posée hors
 * ligne sur un équipement d'un autre secteur n'a jamais été téléchargée. On
 * retombe alors sur la référence courte, qui reste actionnable pour le support.
 */
export function describeRow(
  actionType: OutboxActionType,
  entityId: string,
  itemLabel: string | null | undefined,
): string {
  const geste = ACTION_LABELS[actionType] ?? actionType;
  const nom = itemLabel?.trim();
  return nom
    ? `${geste} · ${nom}`
    : `${geste} · équipement ${shortRef(entityId)}`;
}

const MIN = 60_000;
const HEURE = 60 * MIN;
const JOUR = 24 * HEURE;

/**
 * Durée écoulée, formulée court.
 *
 * Formatage manuel plutôt que `Intl.RelativeTimeFormat` : Hermes n'embarque pas
 * toujours ICU — même raison que le formatage d'heure de `RoutesScreen`.
 */
export function relativeTime(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return 'date inconnue';
  }
  // Une horloge de terminal en avance sur le serveur produirait un écart
  // négatif : on l'aplatit plutôt que d'afficher « il y a -5 min ».
  const ecart = Math.max(0, now.getTime() - t);

  if (ecart < MIN) {
    return 'à l’instant';
  }
  if (ecart < HEURE) {
    return `il y a ${Math.floor(ecart / MIN)} min`;
  }
  if (ecart < JOUR) {
    return `il y a ${Math.floor(ecart / HEURE)} h`;
  }
  return `il y a ${Math.floor(ecart / JOUR)} j`;
}
