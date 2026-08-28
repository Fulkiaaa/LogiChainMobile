import React from 'react';
import {KeyboardAvoidingView, TextInput} from 'react-native';
import TestRenderer from 'react-test-renderer';

import {ReportSheet} from './ReportSheet';

jest.mock('@/components/icons', () => ({MapPin: () => null, X: () => null}));
jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    c: {
      bg: '#fff', surface: '#eee', border: '#ddd', text: '#000', textMuted: '#666',
      primary: '#07f', danger: '#c00', onPrimary: '#fff',
    },
  }),
}));
jest.mock('@/services/geo/location', () => ({getCurrentPosition: jest.fn()}));
jest.mock('@/services/sync/outboxService.instance', () => ({
  outboxService: {enqueueReport: jest.fn()},
}));

const render = () => {
  let tree!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => {
    tree = TestRenderer.create(
      <ReportSheet
        visible
        kind="lost"
        itemId="507f1f77bcf86cd799439011"
        onClose={() => {}}
        onDone={() => {}}
      />,
    );
  });
  return tree;
};

/**
 * Régression : le bandeau est ancré en bas de l'écran dans un `Modal`. Sur iOS,
 * le clavier ne redimensionne pas le contenu d'une modale — il se dessine
 * par-dessus — et masquait donc entièrement le champ de saisie et le bouton.
 *
 * Le test vérifie la seule structure qui empêche cela : un KeyboardAvoidingView
 * autour du bandeau. Le supprimer fait réapparaître le bug.
 */
describe('ReportSheet — le clavier ne doit pas masquer la saisie', () => {
  it('enveloppe le bandeau dans un KeyboardAvoidingView', () => {
    const tree = render();
    expect(tree.root.findAllByType(KeyboardAvoidingView)).toHaveLength(1);
  });

  it("remonte le bandeau au lieu de le rogner (behavior 'padding' sur iOS)", () => {
    const tree = render();
    expect(tree.root.findByType(KeyboardAvoidingView).props.behavior).toBe('padding');
  });

  it('garde le champ de note à l\'intérieur de la zone protégée', () => {
    // Sinon le KeyboardAvoidingView remonterait une zone qui ne contient pas la
    // saisie, et le bug persisterait tout en faisant passer le test précédent.
    const kav = render().root.findByType(KeyboardAvoidingView);
    expect(kav.findAllByType(TextInput)).toHaveLength(1);
  });
});
