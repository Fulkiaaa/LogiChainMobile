/**
 * Cadrage de la carte à l'ouverture.
 *
 * La carte ouvre par défaut sur la position de l'agent — c'est la question
 * qu'il se pose en arrivant sur un site : « où suis-je par rapport au reste ».
 * Mais trois situations doivent l'emporter sur ce réflexe, et la décision est
 * isolée ici pour être testable sans monter un MapView.
 */
export interface AutoLocateParams {
  /** Cible passée par « Voir sur la carte » depuis une fiche équipement. */
  focusItemId?: string;
  /** Cible passée par « Tracer sur la carte » depuis une tournée. */
  focusRouteId?: string;
  /** L'utilisateur a fait glisser ou zoomé la carte depuis l'ouverture. */
  userMovedMap: boolean;
  /** Le recentrage a déjà eu lieu pendant cette visite. */
  alreadyLocated: boolean;
  /** MapKit a terminé sa mise en page (`onMapReady`). */
  mapReady: boolean;
}

export function shouldAutoLocate({
  focusItemId,
  focusRouteId,
  userMovedMap,
  alreadyLocated,
  mapReady,
}: AutoLocateParams): boolean {
  /*
   * Rien avant que MapKit soit prêt. `animateToRegion` transmet la commande au
   * natif sans aucune garde : émise pendant la mise en page initiale, elle est
   * ignorée — et `initialRegion` reste affichée. Comme le relevé GPS revient
   * du cache en quelques millisecondes (`maximumAge: 5000`), c'est le cas
   * NOMINAL, pas un cas limite.
   */
  if (!mapReady) {
    return false;
  }

  // Une cible explicite répond à une question précise : « où est CET
  // équipement », « par où passe CETTE tournée ». Cadrer sur l'agent à la
  // place serait un contresens.
  if (focusItemId || focusRouteId) {
    return false;
  }

  // Le relevé GPS prend une à deux secondes. Si l'agent a déjà manipulé la
  // carte pendant ce temps, la lui reprendre sous les doigts est pire que de
  // ne pas la recentrer.
  if (userMovedMap) {
    return false;
  }

  // Une seule fois par visite : le recentrage est une ouverture, pas un suivi.
  return !alreadyLocated;
}
