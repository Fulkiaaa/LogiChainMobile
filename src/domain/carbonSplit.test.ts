import {carbonShares} from '@/domain/carbonSplit';

describe('répartition fabrication / transport', () => {
  test('deux moitiés égales donnent 50 / 50', () => {
    expect(carbonShares(120, 120)).toEqual({manufacturing: 50, transport: 50});
  });

  test('les parts sont arrondies mais totalisent toujours 100', () => {
    // 1/3 et 2/3 s'arrondissent à 33 et 67 : sans rattrapage, la barre
    // laisserait un pixel vide au bout.
    const parts = carbonShares(100, 200);
    expect(parts).not.toBeNull();
    expect(parts!.manufacturing + parts!.transport).toBe(100);
  });

  test('une seule source occupe toute la barre', () => {
    expect(carbonShares(340, 0)).toEqual({manufacturing: 100, transport: 0});
  });

  test('un total nul ne donne rien à afficher', () => {
    // Un événement qui vient d'être créé : aucune barre plutôt qu'une barre
    // vide, qui se lirait comme une donnée.
    expect(carbonShares(0, 0)).toBeNull();
  });

  test('une valeur négative de l’API est traitée comme zéro', () => {
    expect(carbonShares(-50, 100)).toEqual({manufacturing: 0, transport: 100});
  });

  test('une valeur non finie ne fait pas planter l’écran', () => {
    expect(carbonShares(Number.NaN, 100)).toEqual({manufacturing: 0, transport: 100});
  });
});
