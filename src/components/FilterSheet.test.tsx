import React from 'react';
import {Text} from 'react-native';
import TestRenderer from 'react-test-renderer';

import {FilterSheet} from './FilterSheet';
import {DEFAULT_SORT, type ItemSort} from '@/domain/itemFilter';
import type {ItemCategory} from '@/types/api';

jest.mock('lucide-react-native', () => ({X: () => null, RotateCcw: () => null}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    c: {
      bg: '#fff', surface: '#eee', surfaceAlt: '#e2e8f0', border: '#ddd',
      text: '#000', textMuted: '#666', primary: '#07f', onPrimary: '#fff',
    },
  }),
}));

const render = (
  category: ItemCategory | null = null,
  sort: ItemSort = DEFAULT_SORT,
  onChange = jest.fn(),
  onClose = jest.fn(),
) => {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <FilterSheet
        visible
        category={category}
        sort={sort}
        onChange={onChange}
        onClose={onClose}
      />,
    );
  });
  return {tree, onChange, onClose};
};

/**
 * `Chip` est un composant qui porte lui aussi testID et onPress : on cible le
 * `Pressable` interne, seul à déclarer `accessibilityRole`.
 */
const chip = (tree: TestRenderer.ReactTestRenderer, id: string) =>
  tree.root.findAll(
    (n) =>
      n.props?.testID === id &&
      typeof n.props?.onPress === 'function' &&
      n.props?.accessibilityRole === 'button',
  )[0]!;

const allText = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .join(' | ');

describe('FilterSheet — catégorie', () => {
  it('propose les dix catégories plus « Toutes »', () => {
    const texte = allText(render().tree);
    for (const attendu of [
      'Toutes', 'Structure scénique', 'Son', 'Éclairage', 'Vidéo', 'Énergie',
      'Tente', 'Mobilier', 'Sanitaire', 'Clôture', 'Autre',
    ]) {
      expect(texte).toContain(attendu);
    }
  });

  it('remonte la catégorie choisie', () => {
    const {tree, onChange} = render();
    TestRenderer.act(() => {
      chip(tree, 'cat-sound').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith({category: 'sound', sort: DEFAULT_SORT});
  });

  it('« Toutes » remet la catégorie à null', () => {
    const {tree, onChange} = render('sound');
    TestRenderer.act(() => {
      chip(tree, 'cat-all').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith({category: null, sort: DEFAULT_SORT});
  });

  it('rappuyer sur la catégorie active la désélectionne', () => {
    // Sans ça, l'utilisateur doit chercher « Toutes » pour annuler son choix.
    const {tree, onChange} = render('sound');
    TestRenderer.act(() => {
      chip(tree, 'cat-sound').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith({category: null, sort: DEFAULT_SORT});
  });

  it('marque la catégorie active pour les lecteurs d’écran', () => {
    const {tree} = render('sound');
    expect(chip(tree, 'cat-sound').props.accessibilityState).toEqual({selected: true});
    expect(chip(tree, 'cat-tent').props.accessibilityState).toEqual({selected: false});
  });
});

describe('FilterSheet — tri', () => {
  it('propose les trois tris', () => {
    const texte = allText(render().tree);
    expect(texte).toContain('Libellé A-Z');
    expect(texte).toContain('Statut');
    expect(texte).toContain('Plus récent');
  });

  it('remonte le tri choisi sans toucher à la catégorie', () => {
    const {tree, onChange} = render('sound');
    TestRenderer.act(() => {
      chip(tree, 'sort-recent').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith({category: 'sound', sort: 'recent'});
  });

  it('ne désélectionne pas le tri actif : il en faut toujours un', () => {
    const {tree, onChange} = render(null, 'recent');
    TestRenderer.act(() => {
      chip(tree, 'sort-recent').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith({category: null, sort: 'recent'});
  });
});

describe('FilterSheet — réinitialisation', () => {
  it('remet catégorie et tri à leur valeur par défaut', () => {
    const {tree, onChange} = render('sound', 'recent');
    TestRenderer.act(() => {
      chip(tree, 'filter-reset').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith({category: null, sort: DEFAULT_SORT});
  });

  it('n’offre pas la réinitialisation quand rien n’est filtré', () => {
    const {tree} = render();
    expect(
      tree.root.findAll((n) => n.props?.testID === 'filter-reset'),
    ).toHaveLength(0);
  });
});
