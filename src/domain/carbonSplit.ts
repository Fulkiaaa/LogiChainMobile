/**
 * Répartition de l'empreinte carbone entre fabrication et transport.
 *
 * L'écran KPI affichait quatre chiffres de même poids visuel — total,
 * fabrication, transport, puis des décomptes d'inventaire — sans jamais dire
 * ce qui pèse le plus. Or c'est la seule question que pose un responsable
 * logistique : « d'où vient mon empreinte ? ». Une proportion répond ; quatre
 * nombres alignés, non.
 */
export interface CarbonShares {
  /** Part de la fabrication, en pourcentage entier. */
  manufacturing: number;
  /** Part du transport. La somme des deux vaut exactement 100. */
  transport: number;
}

/** Ramène une valeur d'API douteuse à un nombre positif exploitable. */
const sain = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Renvoie `null` quand il n'y a rien à répartir : un événement sans donnée
 * mérite une absence de barre, pas une barre vide — qui se lirait elle-même
 * comme une information.
 */
export function carbonShares(
  manufacturingCo2Kg: number,
  transportCo2Kg: number,
): CarbonShares | null {
  const fabrication = sain(manufacturingCo2Kg);
  const transport = sain(transportCo2Kg);
  const total = fabrication + transport;

  if (total === 0) {
    return null;
  }

  // On arrondit UNE part et on déduit l'autre : deux arrondis indépendants
  // donneraient 33 + 67 = 100 ici, mais 33 + 33 = 66 ailleurs, et la barre
  // ne remplirait pas sa largeur.
  const partFabrication = Math.round((fabrication / total) * 100);
  return {
    manufacturing: partFabrication,
    transport: 100 - partFabrication,
  };
}
