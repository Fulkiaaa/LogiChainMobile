import type {GeoPoint} from '@/types/api';

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapRegion extends LatLng {
  latitudeDelta: number;
  longitudeDelta: number;
}

interface PolygonGeometry {
  type: string;
  coordinates: number[][][];
}

/** Marge autour de l'étendue, pour que le contenu ne colle pas aux bords. */
const PADDING = 1.35;
/** Ouverture minimale : évite un zoom absurde sur un point unique. */
const MIN_DELTA = 0.004;

/** Longueur d'un degré de latitude, en mètres (constante quelle que soit la latitude). */
const METERS_PER_DEGREE = 111_320;

/**
 * Convertit un anneau extérieur de Polygon GeoJSON en points de carte.
 *
 * GeoJSON ordonne les couples en **[longitude, latitude]**, alors que
 * react-native-maps attend `{latitude, longitude}` : l'inversion est la source
 * d'erreur classique, elle est isolée ici et couverte par les tests.
 *
 * Seul l'anneau extérieur est repris — les zones du modèle n'ont pas de trous.
 */
export function polygonToLatLng(geometry: unknown): LatLng[] {
  const g = geometry as PolygonGeometry | null;
  if (!g || g.type !== 'Polygon' || !Array.isArray(g.coordinates)) {
    return [];
  }
  const ring = g.coordinates[0];
  if (!Array.isArray(ring)) {
    return [];
  }
  return ring
    .filter(p => Array.isArray(p) && p.length >= 2)
    .map(([lng, lat]) => ({latitude: lat, longitude: lng}));
}

/** Cadre de vue englobant tous les points, avec marge. `null` si aucun point. */
export function boundingRegion(points: LatLng[]): MapRegion | null {
  if (points.length === 0) {
    return null;
  }

  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PADDING, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * PADDING, MIN_DELTA),
  };
}

/** Couleur par catégorie de zone, pour distinguer les espaces d'un coup d'œil. */
export const ZONE_COLORS: Record<string, string> = {
  stage: '#7c3aed',
  backstage: '#db2777',
  catering: '#ea580c',
  camping: '#16a34a',
  parking: '#0891b2',
  entrance: '#ca8a04',
  default: '#64748b',
};

/**
 * Cadre serré autour d'un équipement, pour répondre à « où est-il exactement ».
 *
 * Un degré de latitude vaut toujours ~111 km, mais un degré de longitude
 * rétrécit en s'éloignant de l'équateur : il faut diviser par le cosinus de la
 * latitude, sinon le cadre s'aplatit et l'échelle horizontale ment.
 *
 * `spanMeters` est la largeur approximative du cadre. 120 m montre l'équipement
 * et son voisinage immédiat — assez pour reconnaître l'endroit, assez près pour
 * ne pas hésiter entre deux marqueurs.
 */
export function focusRegion(point: LatLng, spanMeters = 120): MapRegion {
  const latitudeDelta = spanMeters / METERS_PER_DEGREE;
  const cos = Math.cos((point.latitude * Math.PI) / 180);
  // Plancher sur le cosinus : il tend vers 0 aux pôles, et la division
  // renverrait alors l'infini — la carte n'afficherait plus rien.
  const longitudeDelta = latitudeDelta / Math.max(Math.abs(cos), 0.01);

  return {
    latitude: point.latitude,
    longitude: point.longitude,
    latitudeDelta,
    longitudeDelta,
  };
}

/**
 * Point GeoJSON → point de carte. Même inversion [lng, lat] → {lat, lng} que
 * `polygonToLatLng`, isolée ici pour la même raison : c'est l'erreur classique.
 *
 * Défensif sur la forme : la position vient d'une API native, un couple
 * incomplet ou un NaN enverrait la carte n'importe où plutôt que d'échouer.
 */
export function pointToLatLng(point: GeoPoint | null | undefined): LatLng | null {
  const lng = point?.coordinates?.[0];
  const lat = point?.coordinates?.[1];
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return {latitude: lat, longitude: lng};
}
