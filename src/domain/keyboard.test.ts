import {inputBottomOffset} from '@/domain/keyboard';

test('clavier fermé : la barre reste à sa marge de repos', () => {
  expect(inputBottomOffset({keyboardHeight: 0, tabBarHeight: 83, base: 24})).toBe(24);
});

test('clavier ouvert : la barre monte de ce que le clavier masque en plus de la barre d’onglets', () => {
  // 336 de clavier, dont 83 recouvraient déjà la barre d'onglets.
  expect(inputBottomOffset({keyboardHeight: 336, tabBarHeight: 83, base: 24})).toBe(277);
});

test('un clavier plus court que la barre d’onglets ne fait pas descendre la barre', () => {
  // Cas d'un clavier matériel : iOS annonce une barre d'accessoires très fine.
  expect(inputBottomOffset({keyboardHeight: 55, tabBarHeight: 83, base: 24})).toBe(24);
});

test('sans barre d’onglets, le décalage vaut toute la hauteur du clavier', () => {
  expect(inputBottomOffset({keyboardHeight: 300, tabBarHeight: 0, base: 16})).toBe(316);
});
