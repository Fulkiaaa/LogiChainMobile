import {existsSync, readFileSync, statSync} from 'fs';
import {join} from 'path';

/**
 * Garde-fou de l'icône iOS.
 *
 * `Contents.json` déclare neuf tailles ; rien, dans Xcode, ne vérifie qu'elles
 * existent réellement avec les bonnes dimensions. Une icône manquante ne casse
 * pas le build : elle produit un emplacement vide sur l'écran d'accueil, ou un
 * refus au moment de la soumission — c'est-à-dire toujours trop tard.
 *
 * Le test relit le catalogue et confronte chaque déclaration au disque, en
 * lisant les dimensions dans l'en-tête PNG (aucune dépendance d'image
 * nécessaire : elles sont à un décalage fixe).
 */
const CATALOGUE = join(
  __dirname,
  '../../ios/LogiChainMobile/Images.xcassets/AppIcon.appiconset',
);

interface Entree {
  size: string;
  scale: string;
  idiom: string;
  filename?: string;
}

const contenu: {images: Entree[]} = JSON.parse(
  readFileSync(join(CATALOGUE, 'Contents.json'), 'utf8'),
);

/**
 * Dimensions d'un PNG, lues dans le bloc IHDR.
 *
 * La signature occupe 8 octets, la longueur et le type du chunk 8 de plus :
 * largeur et hauteur sont donc deux entiers 32 bits gros-boutistes aux
 * décalages 16 et 20.
 */
function dimensionsPng(chemin: string): {largeur: number; hauteur: number} {
  const buf = readFileSync(chemin);
  const signature = buf.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`${chemin} n’est pas un PNG`);
  }
  return {largeur: buf.readUInt32BE(16), hauteur: buf.readUInt32BE(20)};
}

/** Côté attendu en pixels : « 60x60 » en « 3x » vaut 180. */
function cotePixels({size, scale}: Entree): number {
  const points = Number(size.split('x')[0]);
  const facteur = Number(scale.replace('x', ''));
  return points * facteur;
}

describe('icône de l’application iOS', () => {
  test('le catalogue déclare bien neuf tailles', () => {
    expect(contenu.images).toHaveLength(9);
  });

  test('chaque déclaration nomme un fichier', () => {
    // Une entrée sans `filename` est un emplacement vide dans Xcode.
    const orphelines = contenu.images.filter(i => !i.filename);
    expect(orphelines).toEqual([]);
  });

  test.each(contenu.images.map(i => [i.filename ?? '(sans nom)', i] as const))(
    '%s existe et a les dimensions déclarées',
    (nom, entree) => {
      const chemin = join(CATALOGUE, nom);
      expect(existsSync(chemin)).toBe(true);

      const attendu = cotePixels(entree);
      const {largeur, hauteur} = dimensionsPng(chemin);
      expect({largeur, hauteur}).toEqual({largeur: attendu, hauteur: attendu});
    },
  );

  test('l’icône de 1024 px existe : sans elle, l’App Store refuse la soumission', () => {
    const marketing = contenu.images.find(i => i.idiom === 'ios-marketing');
    expect(marketing?.filename).toBeTruthy();
    const {largeur} = dimensionsPng(join(CATALOGUE, marketing!.filename!));
    expect(largeur).toBe(1024);
  });

  test('aucune icône n’est vide', () => {
    // Un PNG de quelques octets trahit une rastérisation qui a échoué en
    // silence — `qlmanage` ne renvoie pas toujours un code d'erreur.
    contenu.images.forEach(i => {
      expect(statSync(join(CATALOGUE, i.filename!)).size).toBeGreaterThan(200);
    });
  });
});
