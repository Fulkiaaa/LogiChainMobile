/**
 * Les deux cibles possibles de l'application.
 *
 * `LOCAL` sert au développement et aux démos : le simulateur iOS partage la
 * pile réseau du Mac, donc `localhost` atteint bien le `npm run dev` de l'API.
 * L'HTTP en clair y est autorisé par `NSAllowsLocalNetworking` dans
 * l'Info.plist — cette exception ne couvre QUE le réseau local, une IP
 * publique en HTTP serait refusée par App Transport Security.
 */
export const API_ENDPOINTS = {
  LOCAL: 'http://localhost:3000/api/v1',
  PROD: 'https://api-logichain.fulkia.fr/api/v1',
} as const;

export const ENV = {
  // ⇩ SEULE ligne à changer pour basculer d'une cible à l'autre.
  API_BASE_URL: API_ENDPOINTS.LOCAL,
  REQUEST_TIMEOUT_MS: 15000,
  SCAN_DEDUP_MS: 1500,
  SYNC_MAX_ATTEMPTS: 5,
} as const;
