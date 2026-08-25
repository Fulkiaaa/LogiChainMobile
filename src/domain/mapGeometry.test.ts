import {
  focusRegion,
  pointToLatLng,boundingRegion, polygonToLatLng, ZONE_COLORS} from '@/domain/mapGeometry';

// Zone réelle du seed (« Scène principale », Festival Vert 2026).
const SCÈNE = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [2.4041, 48.9294],
      [2.4065, 48.9294],
      [2.4065, 48.9318],
      [2.4041, 48.9318],
      [2.4041, 48.9294],
    ],
  ],
};

describe('polygonToLatLng', () => {
  it('inverse l’ordre GeoJSON [lng, lat] vers {latitude, longitude}', () => {
    const pts = polygonToLatLng(SCÈNE);
    expect(pts[0]).toEqual({latitude: 48.9294, longitude: 2.4041});
  });

  it('conserve tous les sommets', () => {
    expect(polygonToLatLng(SCÈNE)).toHaveLength(5);
  });

  it('renvoie une liste vide sur une géométrie absente ou malformée', () => {
    expect(polygonToLatLng(null)).toEqual([]);
    expect(polygonToLatLng({type: 'Polygon', coordinates: []})).toEqual([]);
    expect(polygonToLatLng({type: 'Point', coordinates: [1, 2]} as never)).toEqual([]);
  });
});

describe('boundingRegion', () => {
  it('centre la vue sur le barycentre des points', () => {
    const r = boundingRegion([
      {latitude: 48.92, longitude: 2.40},
      {latitude: 48.94, longitude: 2.42},
    ]);
    expect(r!.latitude).toBeCloseTo(48.93, 5);
    expect(r!.longitude).toBeCloseTo(2.41, 5);
  });

  it('englobe l’étendue avec une marge', () => {
    const r = boundingRegion([
      {latitude: 48.92, longitude: 2.40},
      {latitude: 48.94, longitude: 2.42},
    ]);
    // L'étendue est de 0.02° : le delta doit être plus large pour laisser de l'air.
    expect(r!.latitudeDelta).toBeGreaterThan(0.02);
  });

  it('reste lisible sur un point unique (pas de delta nul)', () => {
    const r = boundingRegion([{latitude: 48.93, longitude: 2.41}]);
    expect(r!.latitudeDelta).toBeGreaterThan(0);
    expect(r!.longitudeDelta).toBeGreaterThan(0);
  });

  it('renvoie null sans aucun point', () => {
    expect(boundingRegion([])).toBeNull();
  });
});

describe('ZONE_COLORS', () => {
  it('couvre les catégories de zone du seed', () => {
    ['stage', 'backstage', 'catering', 'camping', 'parking', 'entrance'].forEach(cat => {
      expect(ZONE_COLORS[cat]).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('donne une couleur distincte à chaque catégorie', () => {
    const cats = ['stage', 'backstage', 'catering', 'camping', 'parking', 'entrance'];
    expect(new Set(cats.map(k => ZONE_COLORS[k])).size).toBe(cats.length);
  });

  it('fournit une couleur de repli pour une catégorie inconnue', () => {
    expect(ZONE_COLORS.default).toBeDefined();
  });
});

describe('focusRegion — cadrage serré sur un équipement', () => {
  const LE_HAVRE = {latitude: 49.5204, longitude: 0.141};

  it('centre exactement sur le point demandé', () => {
    const r = focusRegion(LE_HAVRE);
    expect(r.latitude).toBe(49.5204);
    expect(r.longitude).toBe(0.141);
  });

  it('produit une ouverture beaucoup plus serrée que la vue d’ensemble', () => {
    // Le cadrage global part de MIN_DELTA (0.004). Voir « précisément » un
    // équipement doit zoomer nettement plus près que ça.
    const r = focusRegion(LE_HAVRE);
    expect(r.latitudeDelta).toBeGreaterThan(0);
    expect(r.latitudeDelta).toBeLessThan(0.004);
  });

  it('élargit l’ouverture quand on demande un rayon plus large', () => {
    expect(focusRegion(LE_HAVRE, 500).latitudeDelta).toBeGreaterThan(
      focusRegion(LE_HAVRE, 100).latitudeDelta,
    );
  });

  it('compense le rétrécissement des méridiens vers les pôles', () => {
    // À 49° de latitude, un degré de longitude fait ~65 % d'un degré de
    // latitude : sans la correction en cosinus, le cadre serait ovale.
    const r = focusRegion(LE_HAVRE);
    expect(r.longitudeDelta).toBeGreaterThan(r.latitudeDelta);
  });

  it('reste identique en longitude à l’équateur', () => {
    const r = focusRegion({latitude: 0, longitude: 0});
    expect(r.longitudeDelta).toBeCloseTo(r.latitudeDelta, 6);
  });

  it('ne diverge pas au pôle', () => {
    // cos(90°) vaut 0 : sans garde-fou, la division donnerait l'infini et la
    // carte n'afficherait plus rien.
    const r = focusRegion({latitude: 90, longitude: 0});
    expect(Number.isFinite(r.longitudeDelta)).toBe(true);
  });
});

describe('pointToLatLng — inversion GeoJSON', () => {
  it('inverse [longitude, latitude] en {latitude, longitude}', () => {
    // Le Havre : longitude ~0.14, latitude ~49.52. Une inversion ratée
    // enverrait la carte au large de l'Afrique.
    expect(pointToLatLng({type: 'Point', coordinates: [0.141, 49.5204]})).toEqual({
      latitude: 49.5204,
      longitude: 0.141,
    });
  });

  it('renvoie null quand le point est absent', () => {
    expect(pointToLatLng(null)).toBeNull();
    expect(pointToLatLng(undefined)).toBeNull();
  });

  it('renvoie null quand les coordonnées sont incomplètes', () => {
    expect(pointToLatLng({type: 'Point', coordinates: [0.141]} as never)).toBeNull();
  });

  it('renvoie null quand une coordonnée n’est pas un nombre', () => {
    // La position vient d'une API native : on ne fait pas confiance à la forme.
    expect(pointToLatLng({type: 'Point', coordinates: [0.141, NaN]})).toBeNull();
  });
});
