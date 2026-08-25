import {shouldAutoSync} from '@/domain/autoSync';

test('une action empilée alors qu’on est déjà en ligne déclenche la synchro', () => {
  expect(shouldAutoSync({online: true, freshCount: 1, syncing: false})).toBe(true);
});

test('hors ligne, on n’essaie pas', () => {
  expect(shouldAutoSync({online: false, freshCount: 3, syncing: false})).toBe(false);
});

test('file vide, rien à envoyer', () => {
  expect(shouldAutoSync({online: true, freshCount: 0, syncing: false})).toBe(false);
});

test('une synchro déjà en cours n’en déclenche pas une seconde', () => {
  expect(shouldAutoSync({online: true, freshCount: 5, syncing: true})).toBe(false);
});

test('une action en échec ne relance pas la boucle : elle ne compte pas comme fraîche', () => {
  // `freshCount` exclut les lignes `failed` — sans ça, un 5xx ferait repartir
  // le flush à chaque réécriture de l'outbox, indéfiniment.
  expect(shouldAutoSync({online: true, freshCount: 0, syncing: false})).toBe(false);
});
