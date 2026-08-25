import {
  activeFilterCount,
  filterItems,
  normalizeSearch,
  sortItems,
} from '@/domain/itemFilter';
import type {ItemCategory, ItemStatus} from '@/types/api';

const mk = (
  qrCode: string,
  label: string,
  status: ItemStatus,
  category: ItemCategory = 'other',
  updatedAt = '2026-07-01T10:00:00Z',
) => ({qrCode, label, status, category, updatedAt});

const ITEMS = [
  mk('LC-FENCE-007', 'Barrière Vauban 2m', 'in_transit', 'fencing', '2026-07-04T10:00:00Z'),
  mk('LC-FENCE-009', 'Barrière Vauban 2m', 'deployed', 'fencing', '2026-07-01T10:00:00Z'),
  mk('LC-TENT-005', 'Tente pliante 3x3', 'in_stock', 'tent', '2026-07-03T10:00:00Z'),
  mk('LC-SOUND-001', 'Enceinte façade', 'deployed', 'sound', '2026-07-02T10:00:00Z'),
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
    expect(filterItems(ITEMS, {status: null, query: '', category: null})).toHaveLength(4);
  });

  it('filtre par statut', () => {
    const r = filterItems(ITEMS, {status: 'deployed', query: '', category: null});
    expect(r.map(i => i.qrCode)).toEqual(['LC-FENCE-009', 'LC-SOUND-001']);
  });

  it('cherche dans le QR code', () => {
    const r = filterItems(ITEMS, {status: null, query: 'tent-005', category: null});
    expect(r.map(i => i.qrCode)).toEqual(['LC-TENT-005']);
  });

  it('cherche dans le libellé, sans accent ni casse', () => {
    const r = filterItems(ITEMS, {status: null, query: 'BARRIERE', category: null});
    expect(r).toHaveLength(2);
  });

  it('combine statut ET recherche', () => {
    const r = filterItems(ITEMS, {status: 'deployed', query: 'barriere', category: null});
    expect(r.map(i => i.qrCode)).toEqual(['LC-FENCE-009']);
  });

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(filterItems(ITEMS, {status: null, query: 'zzzz', category: null})).toEqual([]);
  });

  it('ne mute pas la liste source', () => {
    const copy = [...ITEMS];
    filterItems(ITEMS, {status: 'lost', query: 'x', category: null});
    expect(ITEMS).toEqual(copy);
  });
});

describe('filterItems — filtre par catégorie', () => {
  const tous = {status: null, query: '', category: null} as const;

  it('ne filtre rien quand la catégorie est nulle', () => {
    expect(filterItems(ITEMS, tous)).toHaveLength(4);
  });

  it('ne garde que la catégorie demandée', () => {
    const r = filterItems(ITEMS, {...tous, category: 'fencing'});
    expect(r.map(i => i.qrCode)).toEqual(['LC-FENCE-007', 'LC-FENCE-009']);
  });

  it('se combine avec le statut et la recherche', () => {
    const r = filterItems(ITEMS, {status: 'deployed', query: 'barriere', category: 'fencing'});
    expect(r.map(i => i.qrCode)).toEqual(['LC-FENCE-009']);
  });

  it('renvoie une liste vide si catégorie et statut s’excluent', () => {
    expect(filterItems(ITEMS, {...tous, category: 'tent', status: 'deployed'})).toEqual([]);
  });
});

describe('sortItems', () => {
  it('trie par libellé, accents et casse ignorés', () => {
    // « Enceinte façade » doit passer avant « Tente », et les deux barrières
    // rester groupées : un tri brut sur la chaîne placerait « façade » ailleurs.
    const r = sortItems(ITEMS, 'label');
    expect(r.map(i => i.label)).toEqual([
      'Barrière Vauban 2m',
      'Barrière Vauban 2m',
      'Enceinte façade',
      'Tente pliante 3x3',
    ]);
  });

  it('trie par statut dans l’ordre du cycle de vie, pas alphabétique', () => {
    // in_stock → allocated → in_transit → deployed → in_maintenance → lost.
    // L'ordre alphabétique n'a aucun sens métier ici.
    const r = sortItems(ITEMS, 'status');
    expect(r.map(i => i.status)).toEqual(['in_stock', 'in_transit', 'deployed', 'deployed']);
  });

  it('trie du plus récemment mis à jour au plus ancien', () => {
    const r = sortItems(ITEMS, 'recent');
    expect(r.map(i => i.qrCode)).toEqual([
      'LC-FENCE-007',
      'LC-TENT-005',
      'LC-SOUND-001',
      'LC-FENCE-009',
    ]);
  });

  it('ne mute pas la liste source', () => {
    const copy = [...ITEMS];
    sortItems(ITEMS, 'recent');
    expect(ITEMS).toEqual(copy);
  });
});

describe('activeFilterCount', () => {
  it('ne compte ni la recherche ni le tri par défaut', () => {
    // La recherche a déjà son propre affichage (la croix). Le badge du bouton
    // ne doit refléter que ce qui est caché dans le panneau.
    expect(activeFilterCount({category: null, sort: 'label'})).toBe(0);
  });

  it('compte la catégorie', () => {
    expect(activeFilterCount({category: 'sound', sort: 'label'})).toBe(1);
  });

  it('compte un tri différent du tri par défaut', () => {
    expect(activeFilterCount({category: null, sort: 'recent'})).toBe(1);
  });

  it('additionne les deux', () => {
    expect(activeFilterCount({category: 'sound', sort: 'recent'})).toBe(2);
  });
});
