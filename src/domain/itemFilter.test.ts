import {filterItems, normalizeSearch} from '@/domain/itemFilter';
import type {ItemStatus} from '@/types/api';

const mk = (qrCode: string, label: string, status: ItemStatus) =>
  ({qrCode, label, status}) as {qrCode: string; label: string; status: ItemStatus};

const ITEMS = [
  mk('LC-FENCE-007', 'Barrière Vauban 2m', 'in_transit'),
  mk('LC-FENCE-009', 'Barrière Vauban 2m', 'deployed'),
  mk('LC-TENT-005', 'Tente pliante 3x3', 'in_stock'),
  mk('LC-SOUND-001', 'Enceinte façade', 'deployed'),
];

describe('normalizeSearch', () => {
  it('ignore la casse', () => {
    expect(normalizeSearch('BARRIÈRE')).toBe(normalizeSearch('barrière'));
  });

  it('ignore les accents — « barriere » doit trouver « Barrière »', () => {
    expect(normalizeSearch('Barrière')).toBe('barriere');
    expect(normalizeSearch('façade')).toBe('facade');
  });

  it('supprime les espaces de bordure', () => {
    expect(normalizeSearch('  tente  ')).toBe('tente');
  });
});

describe('filterItems', () => {
  it('renvoie tout quand aucun filtre n’est actif', () => {
    expect(filterItems(ITEMS, {status: null, query: ''})).toHaveLength(4);
  });

  it('filtre par statut', () => {
    const r = filterItems(ITEMS, {status: 'deployed', query: ''});
    expect(r.map(i => i.qrCode)).toEqual(['LC-FENCE-009', 'LC-SOUND-001']);
  });

  it('cherche dans le QR code', () => {
    const r = filterItems(ITEMS, {status: null, query: 'tent-005'});
    expect(r.map(i => i.qrCode)).toEqual(['LC-TENT-005']);
  });

  it('cherche dans le libellé, sans accent ni casse', () => {
    const r = filterItems(ITEMS, {status: null, query: 'BARRIERE'});
    expect(r).toHaveLength(2);
  });

  it('combine statut ET recherche', () => {
    const r = filterItems(ITEMS, {status: 'deployed', query: 'barriere'});
    expect(r.map(i => i.qrCode)).toEqual(['LC-FENCE-009']);
  });

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(filterItems(ITEMS, {status: null, query: 'zzzz'})).toEqual([]);
  });

  it('ne mute pas la liste source', () => {
    const copy = [...ITEMS];
    filterItems(ITEMS, {status: 'lost', query: 'x'});
    expect(ITEMS).toEqual(copy);
  });
});
