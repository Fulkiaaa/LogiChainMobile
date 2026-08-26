/**
 * Contraste de couleurs, pour les contrôles posés sur l'aperçu caméra.
 *
 * Ailleurs dans l'application, le fond est celui du thème : on sait ce qu'il y
 * a derrière un texte. Au-dessus de la caméra, le fond est l'image filmée — un
 * hangar sombre, un mur blanc en plein soleil, tout l'intervalle entre les
 * deux. Une couleur n'y est acceptable que si elle reste lisible aux DEUX
 * extrêmes.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** `#rrggbb` → composantes. Renvoie `null` sur une entrée illisible. */
export function parseHex(hex: string): Rgb | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m?.[1]) {
    return null;
  }
  const n = parseInt(m[1], 16);
  return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}

/**
 * Aplatit une couleur semi-transparente sur un fond opaque.
 * C'est ce que fait le compositeur d'iOS pour un voile posé sur la caméra.
 */
export function flatten(fg: Rgb, alpha: number, backdrop: Rgb): Rgb {
  const a = Math.min(1, Math.max(0, alpha));
  return {
    r: fg.r * a + backdrop.r * (1 - a),
    g: fg.g * a + backdrop.g * (1 - a),
    b: fg.b * a + backdrop.b * (1 - a),
  };
}

/** Luminance relative, formule WCAG 2.1. */
export function luminance({r, g, b}: Rgb): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Rapport de contraste WCAG, de 1 (identiques) à 21 (noir sur blanc). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

export const BLACK: Rgb = {r: 0, g: 0, b: 0};
export const WHITE: Rgb = {r: 255, g: 255, b: 255};
