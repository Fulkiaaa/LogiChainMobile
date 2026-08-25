import {toItemDetail} from '@/domain/itemDetail';
import type {CachedItem} from '@/services/db/items.repo';
import type {ItemJSON} from '@/types/api';

const REMOTE: ItemJSON = {
  id: 'i1',
  version: 4,
  createdAt: '2026-06-01T08:00:00Z',
  updatedAt: '2026-07-04T10:00:00Z',
  qrCode: 'LC-SOUND-001',
  label: 'Enceinte façade',
  category: 'sound',
  status: 'deployed',
  eventId: 'e1',
  location: {type: 'Point', coordinates: [0.141033, 49.520412]},
  weightKg: 32,
  purchasePriceEur: 1800,
  lifespanYears: 8,
  manufacturingCo2Kg: 240,
  history: [
    {at: '2026-07-01T08:00:00Z', type: 'allocation', toStatus: 'allocated', operatorId: 'u1'},
    {at: '2026-07-04T10:00:00Z', type: 'deploy', fromStatus: 'in_transit', toStatus: 'deployed', operatorId: 'u2'},
  ],
};

const CACHED: CachedItem = {
  id: 'i1',
  qrCode: 'LC-SOUND-001',
  label: 'Enceinte façade (cache)',
  category: 'sound',
  status: 'in_transit',
  eventId: 'e1',
  lng: 0.14,
  lat: 49.52,
  weightKg: 32,
  version: 3,
  updatedAt: '2026-07-02T10:00:00Z',
};

describe('toItemDetail — la source la plus fraîche gagne', () => {
  it('préfère les données serveur quand elles sont là', () => {
    const v = toItemDetail('i1', REMOTE, CACHED);
    expect(v.label).toBe('Enceinte façade');
    expect(v.status).toBe('deployed');
    expect(v.version).toBe(4);
  });

  it('retombe sur le cache quand le serveur n’a pas répondu', () => {
    // Hors ligne, la fiche doit rester consultable : c'est tout l'intérêt du
    // miroir local.
    const v = toItemDetail('i1', undefined, CACHED);
    expect(v.label).toBe('Enceinte façade (cache)');
    expect(v.status).toBe('in_transit');
  });

  it('signale quand on n’a que le cache', () => {
    expect(toItemDetail('i1', undefined, CACHED).offlineOnly).toBe(true);
    expect(toItemDetail('i1', REMOTE, CACHED).offlineOnly).toBe(false);
  });

  it('accepte le null renvoyé par le cache SQLite', () => {
    // `itemsRepo.findById` renvoie null quand l'équipement n'est pas en cache ;
    // `useQuery` renvoie undefined tant qu'il n'a pas répondu. Les deux formes
    // arrivent ici.
    expect(toItemDetail('i1', REMOTE, null).label).toBe('Enceinte façade');
    expect(toItemDetail('i1', undefined, null).label).toBe('i1');
  });

  it('affiche l’identifiant à défaut de tout le reste', () => {
    const v = toItemDetail('i1', undefined, undefined);
    expect(v.label).toBe('i1');
    expect(v.status).toBeNull();
    expect(v.movements).toEqual([]);
  });
});

describe('toItemDetail — champs que seul le serveur porte', () => {
  it('expose valeur d’achat, durée de vie et CO2 de fabrication', () => {
    const v = toItemDetail('i1', REMOTE, CACHED);
    expect(v.purchasePriceEur).toBe(1800);
    expect(v.lifespanYears).toBe(8);
    expect(v.manufacturingCo2Kg).toBe(240);
  });

  it('les laisse à null quand seul le cache est disponible', () => {
    // Le cache ne stocke pas ces champs : mieux vaut ne rien afficher
    // qu'afficher zéro, qui se lirait comme une vraie valeur.
    const v = toItemDetail('i1', undefined, CACHED);
    expect(v.purchasePriceEur).toBeNull();
    expect(v.lifespanYears).toBeNull();
    expect(v.manufacturingCo2Kg).toBeNull();
  });
});

describe('toItemDetail — position', () => {
  it('inverse l’ordre GeoJSON pour afficher « lat, lng »', () => {
    expect(toItemDetail('i1', REMOTE, CACHED).coords).toBe('49.52041, 0.14103');
  });

  it('utilise la position du cache à défaut', () => {
    expect(toItemDetail('i1', undefined, CACHED).coords).toBe('49.52000, 0.14000');
  });

  it('renvoie null quand l’équipement n’est pas localisé', () => {
    expect(toItemDetail('i1', {...REMOTE, location: null}, undefined).coords).toBeNull();
  });
});

describe('toItemDetail — historique', () => {
  it('rend l’historique du plus récent au plus ancien', () => {
    const v = toItemDetail('i1', REMOTE, CACHED);
    expect(v.movements.map(m => m.title)).toEqual(['Déploiement', 'Affectation']);
  });

  it('renvoie un historique vide hors ligne : le cache ne le stocke pas', () => {
    expect(toItemDetail('i1', undefined, CACHED).movements).toEqual([]);
  });
});
