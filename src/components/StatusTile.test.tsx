import React from 'react';
import {Text} from 'react-native';
import TestRenderer from 'react-test-renderer';

import {StatusTile} from './StatusTile';
import type {ItemStatus} from '@/types/api';

/**
 * Chaque icône se rend en texte `icon:<Nom>` : le test peut ainsi vérifier
 * QUELLE icône a été choisie pour un statut, pas seulement qu'il y en a une.
 */
jest.mock('lucide-react-native', () => {
  const React2 = require('react');
  const {Text: T} = require('react-native');
  const mk = (name: string) => () => React2.createElement(T, null, `icon:${name}`);
  return {
    Package: mk('Package'),
    FileCheck2: mk('FileCheck2'),
    Truck: mk('Truck'),
    CheckCircle2: mk('CheckCircle2'),
    Wrench: mk('Wrench'),
    AlertTriangle: mk('AlertTriangle'),
  };
});
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    c: {
      bg: '#fff', surface: '#eee', surfaceAlt: '#e2e8f0', border: '#ddd',
      text: '#000', textMuted: '#666', primary: '#07f', onPrimary: '#fff',
    },
    statusColors: {
      in_stock: '#475569', allocated: '#0369a1', in_transit: '#b45309',
      deployed: '#15803d', in_maintenance: '#6d28d9', lost: '#b91c1c',
    },
  }),
}));

const render = (status: ItemStatus, count: number, active = false, onPress = jest.fn()) => {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <StatusTile status={status} count={count} active={active} onPress={onPress} />,
    );
  });
  return {tree, onPress};
};

const allText = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .join(' | ');

const tile = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (n) => n.props?.testID === 'status-tile' && typeof n.props?.onPress === 'function',
  )[0]!;

describe('StatusTile', () => {
  it('affiche le nombre et le libellé du statut', () => {
    const texte = allText(render('deployed', 31).tree);
    expect(texte).toContain('31');
    expect(texte).toContain('Déployé');
  });

  it('affiche 0 sans le masquer', () => {
    // Une tuile vide reste une information : « 0 perdu » se lit très bien.
    expect(allText(render('lost', 0).tree)).toContain('0');
  });

  it.each([
    ['in_stock', 'Package'],
    ['allocated', 'FileCheck2'],
    ['in_transit', 'Truck'],
    ['deployed', 'CheckCircle2'],
    ['in_maintenance', 'Wrench'],
    ['lost', 'AlertTriangle'],
  ] as [ItemStatus, string][])('associe l’icône %s → %s', (status, icone) => {
    expect(allText(render(status, 1).tree)).toContain(`icon:${icone}`);
  });

  it('colore le libellé et l’icône avec la couleur du statut', () => {
    const {tree} = render('lost', 3);
    const libelle = tree.root
      .findAllByType(Text)
      .find((n) => n.props.children === 'Perdu')!;
    expect(JSON.stringify(libelle.props.style)).toContain('#b91c1c');
  });

  it('déclenche onPress au toucher', () => {
    const {tree, onPress} = render('deployed', 31);
    TestRenderer.act(() => {
      tile(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalled();
  });

  it('signale l’état actif aux lecteurs d’écran', () => {
    expect(tile(render('deployed', 31, true).tree).props.accessibilityState).toEqual({
      selected: true,
    });
    expect(tile(render('deployed', 31, false).tree).props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('annonce le filtre, pas seulement le chiffre', () => {
    // « 31 » seul ne dit rien à VoiceOver : on énonce la fonction de la tuile.
    expect(tile(render('deployed', 31).tree).props.accessibilityLabel).toBe(
      'Déployé : 31 équipements. Filtrer sur ce statut.',
    );
  });
});
