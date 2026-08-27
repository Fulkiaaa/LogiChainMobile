import React from 'react';
import Svg, {Path} from 'react-native-svg';

import {MARK_PATHS, MARK_STROKE, MARK_VIEWBOX} from '@/domain/brandMark';
import {useTheme} from '@/hooks/useTheme';

/**
 * La marque LogiChain, rendue dans l'application.
 *
 * Détourée, sans fond : elle prend la couleur du thème et suit donc la bascule
 * clair/sombre. L'icône iOS, elle, est un aplat plein — c'est un contexte
 * différent, traité par les fichiers d'export dans `assets/brand/`.
 *
 * `color` permet de forcer une teinte quand le fond n'est pas celui du thème
 * (au-dessus de la caméra, par exemple), sur le modèle de la palette OVERLAY.
 */
export function BrandMark({
  size = 48,
  color,
}: {
  size?: number;
  /** Par défaut, la couleur primaire du thème. */
  color?: string;
}) {
  const {c} = useTheme();
  const tint = color ?? c.primary;

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      // La marque est décorative : le nom « LogiChain » est déjà écrit à côté
      // en toutes lettres. L'annoncer une seconde fois ferait un doublon à
      // l'oreille d'un utilisateur de VoiceOver.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {MARK_PATHS.map(d => (
        <Path
          key={d}
          d={d}
          stroke={tint}
          strokeWidth={MARK_STROKE}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
