/**
 * Position de la barre de saisie quand le clavier est ouvert.
 *
 * La barre est posée en `position: absolute` au-dessus de l'aperçu caméra :
 * rien ne la pousse toute seule, et le clavier la recouvrait entièrement.
 *
 * Le clavier iOS annonce sa hauteur depuis le BAS DE L'ÉCRAN, alors que la
 * barre est déjà remontée au-dessus de la barre d'onglets. Décaler de la
 * hauteur brute du clavier la ferait donc monter deux fois trop haut — il faut
 * retrancher ce qu'elle gagnait déjà.
 */
export function inputBottomOffset(p: {
  /** Hauteur annoncée par le clavier. 0 quand il est fermé. */
  keyboardHeight: number;
  /** Hauteur de la barre d'onglets, déjà déduite de la zone de l'écran. */
  tabBarHeight: number;
  /** Marge au repos, clavier fermé. */
  base: number;
}): number {
  if (p.keyboardHeight <= 0) {
    return p.base;
  }
  const gagne = Math.max(0, p.keyboardHeight - p.tabBarHeight);
  return gagne + p.base;
}
