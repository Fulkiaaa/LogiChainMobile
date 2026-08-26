import {
  ROUTE_STATUS_LABELS,
  TRANSPORT_MODE_LABELS,
  nextStop,
  routePath,
  toRouteView,
} from '@/domain/route';
import type {RouteJSON, RouteStop} from '@/types/api';

const stop = (seq: number, label: string, lng: number, lat: number, done = false): RouteStop => ({
  id: `s${seq}`,
  sequence: seq,
  label,
  type: seq === 0 ? 'pickup' : 'dropoff',
  location: {type: 'Point', coordinates: [lng, lat]},
  scheduledAt: `2026-07-0${seq + 7}T08:00:00.000Z`,
  completedAt: done ? '2026-07-08T09:00:00.000Z' : null,
  itemIds: seq === 0 ? [] : ['i1', 'i2'],
});

const ROUTE: RouteJSON = {
  id: 'r1', version: 0, createdAt: '', updatedAt: '',
  reference: 'RTE-2026-03', eventId: 'e1', transporterId: 't1',
  mode: 'rail', status: 'planned',
  plannedDistanceKm: 680, actualDistanceKm: null, totalWeightKg: 9800,
  stops: [stop(1, 'Gare fret Paris', 2.36, 48.88), stop(0, 'Dépôt Toulouse', 1.444, 43.6045)],
};

describe('toRouteView', () => {
  test('traduit le mode et le statut', () => {
    const v = toRouteView(ROUTE);
    expect(v.modeLabel).toBe(TRANSPORT_MODE_LABELS.rail);
    expect(v.statusLabel).toBe(ROUTE_STATUS_LABELS.planned);
  });

  test('à défaut de distance réelle, la distance planifiée sert au carbone', () => {
    // Même arbitrage que `distanceUsedForCarbonKm` côté API.
    const v = toRouteView(ROUTE);
    expect(v.distanceKm).toBe(680);
    expect(v.distanceIsActual).toBe(false);
  });

  test('la distance réelle l’emporte dès qu’elle est relevée', () => {
    const v = toRouteView({...ROUTE, plannedDistanceKm: 18, actualDistanceKm: 19.5});
    expect(v.distanceKm).toBe(19.5);
    expect(v.distanceIsActual).toBe(true);
  });

  test('expose le poids en tonnes et le décompte des étapes', () => {
    const v = toRouteView(ROUTE);
    expect(v.weightTonnes).toBeCloseTo(9.8);
    expect(v.stopCount).toBe(2);
    expect(v.itemCount).toBe(2);
  });
});

describe('routePath', () => {
  test('ordonne par séquence et inverse GeoJSON lng,lat → lat,lng', () => {
    // L'API ne garantit pas l'ordre du tableau : c'est `sequence` qui fait foi.
    expect(routePath(ROUTE.stops)).toEqual([
      {latitude: 43.6045, longitude: 1.444},
      {latitude: 48.88, longitude: 2.36},
    ]);
  });

  test('une étape sans coordonnées exploitables est écartée, pas fatale', () => {
    const cassee = {...stop(2, 'Sans position', 0, 0), location: null as never};
    expect(routePath([...ROUTE.stops, cassee])).toHaveLength(2);
  });

  test('moins de deux points ne trace aucun trajet', () => {
    expect(routePath([stop(0, 'Unique', 1, 2)])).toHaveLength(0);
  });
});

describe('nextStop', () => {
  test('renvoie la première étape non terminée, dans l’ordre', () => {
    expect(nextStop(ROUTE.stops)?.label).toBe('Dépôt Toulouse');
  });

  test('saute les étapes déjà terminées', () => {
    const stops = [stop(0, 'Dépôt', 1, 2, true), stop(1, 'Site', 3, 4)];
    expect(nextStop(stops)?.label).toBe('Site');
  });

  test('tournée terminée : plus d’étape suivante', () => {
    expect(nextStop([stop(0, 'Dépôt', 1, 2, true)])).toBeNull();
  });
});

test('les cinq statuts de l’API sont traduits, brouillon compris', () => {
  // Le miroir doit être exhaustif : un statut non traduit s'afficherait en
  // anglais brut à l'écran.
  expect(Object.keys(ROUTE_STATUS_LABELS).sort()).toEqual(
    ['cancelled', 'completed', 'draft', 'in_progress', 'planned'],
  );
});

test('les cinq modes de transport de l’API sont traduits', () => {
  expect(Object.keys(TRANSPORT_MODE_LABELS).sort()).toEqual(
    ['bike_cargo', 'electric_truck', 'rail', 'truck', 'van'],
  );
});
