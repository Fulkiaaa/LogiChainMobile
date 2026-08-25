import {STATUS_LABELS} from '@/config/theme';
import type {ItemMovement} from '@/types/api';

/** Une entrée d'historique prête à afficher — aucune logique dans l'écran. */
export interface MovementLine {
  /** Date locale, forme `jj/mm/aaaa · hh:mm`. */
  at: string;
  title: string;
  /** `null` quand le statut n'a pas changé ou que l'origine est inconnue. */
  transition: string | null;
  note?: string;
  hasLocation: boolean;
}

const MOVEMENT_LABELS: Record<ItemMovement['type'], string> = {
  scan: 'Pointage',
  allocation: 'Affectation',
  transit: 'Mise en transit',
  deploy: 'Déploiement',
  maintenance: 'Maintenance',
  anomaly: 'Anomalie signalée',
  return: 'Retour au stock',
};

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Formatage manuel plutôt que `toLocaleString` : Hermes n'embarque pas
 * toujours ICU, et le résultat varierait alors d'un appareil à l'autre. Les
 * getters locaux respectent le fuseau de l'appareil, ce qu'on veut sur le
 * terrain.
 */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Historique de l'API → lignes affichables, du plus récent au plus ancien.
 * Ne mute pas l'entrée.
 */
export function toMovementLines(history: ItemMovement[]): MovementLine[] {
  return [...history]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(m => ({
      at: formatDate(m.at),
      title: MOVEMENT_LABELS[m.type],
      // Une transition ne s'affiche que si elle dit quelque chose : un pointage
      // laisse le statut inchangé, « Déployé → Déployé » serait du bruit.
      transition:
        m.fromStatus !== undefined && m.fromStatus !== m.toStatus
          ? `${STATUS_LABELS[m.fromStatus]} → ${STATUS_LABELS[m.toStatus]}`
          : null,
      ...(m.note !== undefined ? {note: m.note} : {}),
      hasLocation: m.location !== undefined && m.location !== null,
    }));
}

/**
 * Coordonnées lisibles. L'entrée suit l'ordre d'affichage (lat, lng) et non
 * l'ordre GeoJSON (lng, lat) : l'inversion se fait chez l'appelant, au plus
 * près de la donnée brute.
 */
export function formatCoords(lat: number | null, lng: number | null): string | null {
  if (lat === null || lng === null) {
    return null;
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
