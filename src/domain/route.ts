import {pointToLatLng, type LatLng} from '@/domain/mapGeometry';
import type {RouteJSON, RouteStatus, RouteStop, StopType, TransportMode} from '@/types/api';

export const TRANSPORT_MODE_LABELS: Record<TransportMode, string> = {
  truck: 'Camion thermique',
  electric_truck: 'Camion électrique',
  van: 'Utilitaire',
  rail: 'Fret ferroviaire',
  bike_cargo: 'Vélo cargo',
};

export const ROUTE_STATUS_LABELS: Record<RouteStatus, string> = {
  draft: 'Brouillon',
  planned: 'Planifiée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
};

export const STOP_TYPE_LABELS: Record<StopType, string> = {
  pickup: 'Chargement',
  dropoff: 'Livraison',
  transit: 'Passage',
};

/** Tout ce que l'écran affiche d'une tournée, déjà résolu. */
export interface RouteView {
  id: string;
  reference: string;
  modeLabel: string;
  mode: TransportMode;
  statusLabel: string;
  status: RouteStatus;
  /** Distance retenue pour le calcul carbone. */
  distanceKm: number;
  /** Vraie si la distance vient d'un relevé terrain, fausse si elle est prévisionnelle. */
  distanceIsActual: boolean;
  weightTonnes: number;
  stopCount: number;
  itemCount: number;
}

/**
 * Prépare l'affichage d'une tournée.
 *
 * `distanceKm` reproduit l'arbitrage `actualDistanceKm ?? plannedDistanceKm` de
 * `CarbonFootprintService` : c'est cette valeur qui alimente l'empreinte de
 * transport. `distanceIsActual` permet de le dire à l'écran, pour qu'on ne
 * confonde pas une prévision avec une mesure.
 */
export function toRouteView(r: RouteJSON): RouteView {
  const actual = r.actualDistanceKm;
  const isActual = typeof actual === 'number' && actual >= 0;
  return {
    id: r.id,
    reference: r.reference,
    mode: r.mode,
    modeLabel: TRANSPORT_MODE_LABELS[r.mode] ?? r.mode,
    status: r.status,
    statusLabel: ROUTE_STATUS_LABELS[r.status] ?? r.status,
    distanceKm: isActual ? actual : r.plannedDistanceKm,
    distanceIsActual: isActual,
    weightTonnes: r.totalWeightKg / 1000,
    stopCount: r.stops.length,
    itemCount: new Set(r.stops.flatMap(s => s.itemIds)).size,
  };
}

/** Étapes remises dans l'ordre du parcours. L'API ne garantit pas l'ordre du tableau. */
export function orderedStops(stops: RouteStop[]): RouteStop[] {
  return [...stops].sort((a, b) => a.sequence - b.sequence);
}

/**
 * Tracé de la tournée, prêt pour `<Polyline>`.
 *
 * Renvoie un tableau vide en deçà de deux points : une polyligne d'un seul
 * point ne se dessine pas, et laisser passer le cas ferait afficher un trajet
 * qui n'existe pas.
 */
export function routePath(stops: RouteStop[]): LatLng[] {
  const points = orderedStops(stops)
    .map(s => pointToLatLng(s.location))
    .filter((p): p is LatLng => p !== null);
  return points.length >= 2 ? points : [];
}

/** Prochaine étape à traiter : la première non terminée, dans l'ordre. */
export function nextStop(stops: RouteStop[]): RouteStop | null {
  return orderedStops(stops).find(s => !s.completedAt) ?? null;
}
