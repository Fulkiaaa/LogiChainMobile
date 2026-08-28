import React from 'react';
import {Text} from 'react-native';
import TestRenderer from 'react-test-renderer';

import {ModeSelector} from './ModeSelector';
import type {UserRole} from '@/types/api';

jest.mock('@/components/icons', () => ({
  MapPin: () => null,
  PackageCheck: () => null,
  Truck: () => null,
  Lock: () => null,
}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    c: {
      bg: '#fff', surface: '#eee', border: '#ddd', text: '#000', textMuted: '#666',
      primary: '#07f', danger: '#c00', warning: '#e90', onPrimary: '#fff',
    },
  }),
}));

const render = (role: UserRole, onChange = jest.fn()) => {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <ModeSelector mode="pointage" role={role} onChange={onChange} />,
    );
  });
  return {tree, onChange};
};

/**
 * React Native enveloppe `Pressable` (memo + forwardRef), donc comparer
 * `node.type` à l'export échoue. On cible le nœud qui porte le testID ET un
 * onPress : c'est celui qui reçoit réellement l'appui.
 */
const chip = (tree: TestRenderer.ReactTestRenderer, mode: string) =>
  tree.root.findAll(
    (n) => n.props?.testID === `mode-${mode}` && typeof n.props?.onPress === 'function',
  )[0]!;

const allText = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .join(' | ');

/**
 * Le transporteur n'a pas le droit de déployer (`requireRole` côté API). Sans
 * cette garde, l'action partait quand même : 403, cinq tentatives, puis
 * annulation silencieuse de l'affichage. L'utilisateur voyait son scan
 * disparaître sans explication.
 */
describe('ModeSelector — un mode interdit reste visible mais verrouillé', () => {
  it('n’émet pas onChange quand un transporteur appuie sur Déploiement', () => {
    const {tree, onChange} = render('transporter');
    TestRenderer.act(() => {
      chip(tree, 'deploy').props.onPress();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('émet onChange quand un agent de terrain appuie sur Déploiement', () => {
    const {tree, onChange} = render('field_agent');
    TestRenderer.act(() => {
      chip(tree, 'deploy').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('deploy');
  });

  it('garde le mode interdit affiché plutôt que de le masquer', () => {
    // Masquer laisserait croire que le mode n'existe pas. On veut que le
    // transporteur voie qu'il existe, et pourquoi il ne l'a pas.
    const {tree} = render('transporter');
    expect(chip(tree, 'deploy')).toBeDefined();
    expect(allText(tree)).toContain('Déploiement');
  });

  it('affiche la raison du refus, en nommant le rôle de l’utilisateur', () => {
    const {tree} = render('transporter');
    const texte = allText(tree);
    expect(texte).toContain('Transporteur');
    expect(texte).toContain('Agent de terrain');
  });

  it('n’affiche aucune raison quand tous les modes sont autorisés', () => {
    const {tree} = render('field_agent');
    expect(allText(tree)).not.toContain('Réservé à');
  });

  it('marque le mode interdit comme désactivé pour les lecteurs d’écran', () => {
    const {tree} = render('transporter');
    expect(chip(tree, 'deploy').props.accessibilityState).toEqual({disabled: true});
  });

  it('laisse les modes ouverts actionnables pour un transporteur', () => {
    const {tree, onChange} = render('transporter');
    TestRenderer.act(() => {
      chip(tree, 'transit').props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith('transit');
  });
});
