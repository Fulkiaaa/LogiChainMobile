import {shouldAutoLocate} from '@/domain/mapFraming';

/** Cas nominal : on ouvre la carte depuis l'onglet, sans rien demander de précis. */
const ouvertureSimple = {
  focusItemId: undefined,
  focusRouteId: undefined,
  userMovedMap: false,
  alreadyLocated: false,
  mapReady: true,
};

describe('recentrage automatique à l’ouverture de la carte', () => {
  test('une ouverture sans cible se recentre sur l’utilisateur', () => {
    expect(shouldAutoLocate(ouvertureSimple)).toBe(true);
  });

  test('une arrivée depuis une fiche équipement garde la cible demandée', () => {
    // « Voir sur la carte » pose une question précise : « où est CET
    // équipement ». Y répondre en cadrant sur l'agent serait un contresens.
    expect(shouldAutoLocate({...ouvertureSimple, focusItemId: 'item-42'})).toBe(false);
  });

  test('une arrivée depuis une tournée garde le tracé', () => {
    expect(shouldAutoLocate({...ouvertureSimple, focusRouteId: 'route-7'})).toBe(false);
  });

  test('la carte ne bouge plus dès que l’utilisateur l’a manipulée', () => {
    // Le relevé GPS prend une à deux secondes. Si l'agent a déjà fait glisser
    // la carte pendant ce temps, la lui reprendre sous les doigts est pire que
    // de ne pas la recentrer du tout.
    expect(shouldAutoLocate({...ouvertureSimple, userMovedMap: true})).toBe(false);
  });

  test('le recentrage n’a lieu qu’une fois par visite', () => {
    expect(shouldAutoLocate({...ouvertureSimple, alreadyLocated: true})).toBe(false);
  });

  test('une cible explicite l’emporte même si rien d’autre ne s’y oppose', () => {
    expect(
      shouldAutoLocate({
        focusItemId: 'item-42',
        focusRouteId: 'route-7',
        userMovedMap: false,
        alreadyLocated: false,
        mapReady: true,
      }),
    ).toBe(false);
  });

  test('rien ne bouge tant que MapKit n’a pas fini sa mise en page', () => {
    // `animateToRegion` part directement au natif, sans garde : émise avant que
    // la carte soit prête, l'animation est ignorée et `initialRegion` gagne.
    // C'est précisément ce qui faisait échouer le recentrage en silence.
    expect(shouldAutoLocate({...ouvertureSimple, mapReady: false})).toBe(false);
  });

  test('une chaîne vide ne compte pas comme une cible', () => {
    // Un paramètre de navigation mal formé ne doit pas désactiver le
    // recentrage : seule une vraie cible le fait.
    expect(shouldAutoLocate({...ouvertureSimple, focusItemId: ''})).toBe(true);
  });
});
