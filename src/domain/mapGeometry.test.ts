import {boundingRegion, polygonToLatLng, ZONE_COLORS} from '@/domain/mapGeometry';

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
