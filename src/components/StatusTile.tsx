import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Package,
  Truck,
  Wrench,
} from 'lucide-react-native';

import {STATUS_LABELS, type Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import type {ItemStatus} from '@/types/api';

/**
 * Une icône par état du matériel. Elles disent la même chose que le libellé,
 * en plus rapide à balayer : le carton pour le stock dormant, le camion pour ce
 * qui roule, le triangle pour ce qu'on a perdu.
 */
const STATUS_ICONS: Record<ItemStatus, typeof Package> = {
  in_stock: Package,
  allocated: FileCheck2,
  in_transit: Truck,
  deployed: CheckCircle2,
  in_maintenance: Wrench,
  lost: AlertTriangle,
};

export function StatusTile({
  status,
  count,
  active,
  onPress,
}: {
  status: ItemStatus;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  const {c, statusColors} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const tint = statusColors[status];
  const Icon = STATUS_ICONS[status];
  const label = STATUS_LABELS[status];

  return (
    <Pressable
      testID="status-tile"
      accessibilityRole="button"
      accessibilityState={{selected: active}}
      // Le chiffre seul ne dit rien hors contexte : on énonce l'état, le
      // décompte, et ce que fait l'appui.
      accessibilityLabel={`${label} : ${count} équipements. Filtrer sur ce statut.`}
      onPress={onPress}
      style={[styles.tile, active && styles.tileActive]}>
      <View style={styles.texts}>
        <Text style={styles.count}>{count}</Text>
        <Text
          style={[styles.label, {color: tint}]}
          numberOfLines={1}
          // « Maintenance » est un mot d'un seul tenant : il ne peut pas se
          // couper. Sans réduction, il se faisait tronquer en « Mainten… ».
          adjustsFontSizeToFit
          minimumFontScale={0.85}>
          {label}
        </Text>
      </View>
      <Icon color={tint} size={20} strokeWidth={2} />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 4,
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 12,
      // Bordure de 2 px dès le repos, transparente : l'état actif ne fait que
      // la colorer. Sans cela, l'apparition d'une bordure décalerait le contenu
      // de la tuile de 1 px à chaque sélection.
      borderWidth: 2,
      borderColor: 'transparent',
    },
    /*
     * La sélection ne change QUE la bordure.
     *
     * Elle passait le fond à `surfaceAlt`, plus proche de la couleur des
     * libellés : trois statuts y tombaient sous 4,5:1 (« Perdu » à 3,74:1).
     * Sélectionner un filtre rendait donc son libellé moins lisible qu'au
     * repos — l'inverse de ce qu'un état actif doit faire.
     */
    tileActive: {borderColor: c.primary},
    // `flexShrink` autorise le bloc texte à se compresser avant l'icône : sans
    // lui, un libellé long pousse l'icône hors de la tuile.
    texts: {flexShrink: 1, gap: 4},
    count: {color: c.text, fontSize: 26, fontWeight: '800', lineHeight: 30},
    label: {fontSize: 14, fontWeight: '600'},
  });
