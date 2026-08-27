/**
 * Géométrie de la marque LogiChain.
 *
 * Isolée du composant pour une raison pratique : les mêmes tracés servent au
 * rendu dans l'application (`react-native-svg`) ET aux fichiers `.svg`
 * d'export qui produisent l'icône iOS. Une seule définition, deux sorties —
 * sinon les deux divergent au premier ajustement.
 *
 * ## Le dessin
 *
 * Un carré utile de (4,4) à (20,20) dont les quatre angles sont occupés :
 *
 *     ╷        ╶┐      · le L tient les angles supérieur GAUCHE
 *     │          │       (son sommet) et inférieur GAUCHE (son angle)
 *     │          │     · deux équerres de visée tiennent les
 *     │          │       angles de droite
 *     └───╴    ╶─┘
 *
 * Les quatre angles d'un viseur de scan sont donc présents, mais deux d'entre
 * eux appartiennent à une lettre. Le cadre et le L partagent le même trait au
 * lieu d'empiler un monogramme dans un cadre.
 *
 * ## Les proportions
 *
 * Hampe de 16 unités pour un pied de 6 : au-delà, le L cesse de se lire comme
 * une lettre et redevient une simple équerre. Le pied s'arrête à mi-parcours
 * pour dégager le centre — sans ce vide, les trois formes se rejoignent en une
 * masse illisible à 60 px, la taille réelle d'une icône iOS.
 */

/** Côté de la grille de référence. Toutes les coordonnées y sont exprimées. */
export const MARK_VIEWBOX = 24;

/**
 * Épaisseur du trait.
 *
 * 2,5 est exactement le `strokeWidth` employé par les icônes `lucide` de
 * l'application : la marque appartient ainsi à la même famille visuelle que
 * le reste de l'interface, au lieu d'y être collée.
 */
export const MARK_STROKE = 2.5;

/** Bornes du carré utile — les quatre angles du viseur s'y appuient. */
export const MARK_MIN = 4;
export const MARK_MAX = 20;

/** Longueur des bras d'une équerre de visée. */
const BRAS = 4;
/** Longueur du pied du L. Plus court que les bras ne le suggèrent : voir plus haut. */
const PIED = 6;

/** Le L — tient les deux angles de gauche à lui seul. */
export const MARK_L = `M${MARK_MIN} ${MARK_MIN} V${MARK_MAX} H${MARK_MIN + PIED}`;

/** Équerre de visée, angle supérieur droit. */
export const MARK_CORNER_TR = `M${MARK_MAX - BRAS} ${MARK_MIN} H${MARK_MAX} V${MARK_MIN + BRAS}`;

/** Équerre de visée, angle inférieur droit. */
export const MARK_CORNER_BR = `M${MARK_MAX} ${MARK_MAX - BRAS} V${MARK_MAX} H${MARK_MAX - BRAS}`;

/** Les trois tracés, dans l'ordre de dessin. */
export const MARK_PATHS: readonly string[] = [MARK_L, MARK_CORNER_TR, MARK_CORNER_BR];

/** Couleur de la marque — `primary` du thème clair. Voir `theme.ts`. */
export const MARK_INK = '#0369a1';
/** Encre posée SUR l'aplat, pour l'icône. `bg` du thème clair. */
export const MARK_ON_INK = '#f8fafc';
