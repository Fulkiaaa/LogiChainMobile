import React from 'react';
import TestRenderer from 'react-test-renderer';

import {BrandMark} from './BrandMark';
import {MARK_PATHS} from '@/domain/brandMark';

/**
 * `react-native-svg` est remplacé par des éléments hôtes inertes : le test
 * porte sur les props transmises (couleur, taille, tracés), pas sur le rendu
 * natif, qui n'existe pas hors appareil.
 */
jest.mock('react-native-svg', () => {
  const React2 = require('react');
  const mk = (name: string) =>
    ({children, ...props}: Record<string, unknown> & {children?: React.ReactNode}) =>
      React2.createElement(name, props, children);
  return {__esModule: true, default: mk('Svg'), Path: mk('Path')};
});

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({c: {primary: '#0369a1'}}),
}));

const rendre = (props: Parameters<typeof BrandMark>[0] = {}) => {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(<BrandMark {...props} />);
  });
  return tree.root;
};

describe('BrandMark', () => {
  test('dessine les trois tracés de la marque', () => {
    const paths = rendre().findAllByType('Path' as never);
    expect(paths.map(p => p.props.d)).toEqual([...MARK_PATHS]);
  });

  test('prend la couleur primaire du thème par défaut', () => {
    const paths = rendre().findAllByType('Path' as never);
    paths.forEach(p => expect(p.props.stroke).toBe('#0369a1'));
  });

  test('une couleur explicite l’emporte sur le thème', () => {
    // Cas d'usage : marque posée sur un fond qui n'est pas celui du thème.
    const paths = rendre({color: '#f8fafc'}).findAllByType('Path' as never);
    paths.forEach(p => expect(p.props.stroke).toBe('#f8fafc'));
  });

  test('la taille demandée s’applique aux deux dimensions', () => {
    const svg = rendre({size: 96}).findByType('Svg' as never);
    expect(svg.props.width).toBe(96);
    expect(svg.props.height).toBe(96);
  });

  test('le viewBox reste celui de la grille de référence', () => {
    // Le changer désaligne la marque de ses tracés.
    const svg = rendre().findByType('Svg' as never);
    expect(svg.props.viewBox).toBe('0 0 24 24');
  });

  test('la marque est masquée aux lecteurs d’écran', () => {
    // Le nom est déjà écrit à côté : l'annoncer deux fois ferait un doublon.
    const svg = rendre().findByType('Svg' as never);
    expect(svg.props.accessibilityElementsHidden).toBe(true);
  });
});
