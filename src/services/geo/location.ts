import {Platform} from 'react-native';
import Geolocation from 'react-native-geolocation-service';

import type {GeoPoint} from '@/types/api';

/**
 * Demande l'autorisation « pendant l'utilisation » sur iOS. Sans cet appel,
 * getCurrentPosition échoue silencieusement au premier usage même si la clé
 * NSLocationWhenInUseUsageDescription est présente dans Info.plist.
 *
 * Idempotent : iOS ne montre la boîte de dialogue qu'une fois.
 */
async function ensureAuthorized(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return;
  }
  const result = await Geolocation.requestAuthorization('whenInUse');
  if (result !== 'granted') {
    throw new Error(
      result === 'denied'
        ? 'autorisation refusée (Réglages → LogiChain → Position)'
        : `autorisation indisponible (${result})`,
    );
  }
}

/**
 * Récupère la position courante (à la demande — jamais de tracking continu,
 * pour préserver la batterie). Renvoie un GeoPoint [lng, lat].
 */
export async function getCurrentPosition(): Promise<GeoPoint> {
  await ensureAuthorized();
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
