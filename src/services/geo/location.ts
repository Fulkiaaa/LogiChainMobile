import Geolocation from 'react-native-geolocation-service';

import type {GeoPoint} from '@/types/api';

/**
 * Récupère la position courante (à la demande — jamais de tracking continu,
 * pour préserver la batterie). Renvoie un GeoPoint [lng, lat].
 */
export function getCurrentPosition(): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      pos =>
        resolve({
          type: 'Point',
          coordinates: [pos.coords.longitude, pos.coords.latitude],
        }),
      err => reject(new Error(err.message)),
      {enableHighAccuracy: true, timeout: 8000, maximumAge: 5000},
    );
  });
}
