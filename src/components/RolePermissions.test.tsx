import React from 'react';
import {Text} from 'react-native';
import TestRenderer from 'react-test-renderer';

import {RolePermissions} from './RolePermissions';
import type {UserRole} from '@/types/api';

jest.mock('@/components/icons', () => ({Check: () => null, Lock: () => null}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    c: {
      bg: '#fff', surface: '#eee', border: '#ddd', text: '#000', textMuted: '#666',
      primary: '#07f', danger: '#c00', warning: '#e90', success: '#0a0', onPrimary: '#fff',
    },
  }),
}));

const render = (role: UserRole | null) => {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(<RolePermissions role={role} />);
  });
  return tree;
};

const rows = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll((n) => typeof n.props?.testID === 'string' && n.props.testID.startsWith('cap-'))
    .filter((n) => typeof n.type !== 'string')
    .map((n) => ({
      cap: (n.props.testID as string).replace('cap-', ''),
      autorise: n.props.accessibilityState?.disabled !== true,
    }));

const allText = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(Text)
    .map((n) => (Array.isArray(n.props.children) ? n.props.children.join('') : n.props.children))
    .join(' | ');

/**
 * Le parcours par rôle, rendu visible dans l'app elle-même : l'utilisateur voit
 * la liste complète des gestes, et lesquels lui sont ouverts. Masquer les
 * gestes interdits laisserait croire qu'ils n'existent pas.
 */
describe('RolePermissions — la liste complète, autorisés et interdits', () => {
  it('liste les 7 gestes quel que soit le rôle', () => {
    expect(rows(render('transporter'))).toHaveLength(7);
    expect(rows(render('admin'))).toHaveLength(7);
  });

  it('montre le déploiement comme interdit pour un transporteur', () => {
    const r = rows(render('transporter'));
    expect(r.find((x) => x.cap === 'deploy')?.autorise).toBe(false);
    expect(r.find((x) => x.cap === 'transit')?.autorise).toBe(true);
  });

  it('montre le déploiement comme autorisé pour un agent de terrain', () => {
    const r = rows(render('field_agent'));
    expect(r.find((x) => x.cap === 'deploy')?.autorise).toBe(true);
  });

  it('n’ouvre la gestion des comptes qu’à l’admin', () => {
    expect(rows(render('admin')).find((x) => x.cap === 'manageUsers')?.autorise).toBe(true);
    expect(
      rows(render('logistics_manager')).find((x) => x.cap === 'manageUsers')?.autorise,
    ).toBe(false);
  });

  it('affiche tout en autorisé pour l’admin', () => {
    expect(rows(render('admin')).every((x) => x.autorise)).toBe(true);
  });

  it('explique chaque refus plutôt que de le laisser muet', () => {
    const texte = allText(render('transporter'));
    expect(texte).toContain('Réservé à');
    expect(texte).toContain('Transporteur');
  });

  it('ne plante pas quand le rôle n’est pas encore chargé', () => {
    expect(rows(render(null)).every((x) => !x.autorise)).toBe(true);
  });
});
