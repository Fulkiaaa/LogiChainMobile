import {CATEGORY_LABELS, categoryLabel} from '@/config/theme';
import {ITEM_CATEGORIES} from '@/types/api';

describe('CATEGORY_LABELS', () => {
  it('couvre les dix catégories de l’API', () => {
    for (const cat of ITEM_CATEGORIES) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
    }
    expect(Object.keys(CATEGORY_LABELS)).toHaveLength(ITEM_CATEGORIES.length);
  });
});

describe('categoryLabel', () => {
  it('traduit une catégorie connue', () => {
    expect(categoryLabel('lighting')).toBe('Éclairage');
    expect(categoryLabel('staging')).toBe('Structure scénique');
  });

  it('renvoie la clé brute pour une catégorie inconnue', () => {
    // Les clés de `byCategory` viennent de l'API en `Record<string, number>` :
    // rien ne garantit qu'elles appartiennent à l'énumération. Si l'API ajoute
    // une catégorie, on veut afficher son nom brut, jamais « undefined ».
    expect(categoryLabel('drone')).toBe('drone');
  });

  it('ne casse pas sur une clé vide', () => {
    expect(categoryLabel('')).toBe('');
  });
});
