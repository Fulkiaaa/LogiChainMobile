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
      paddingVertical: 14,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    tileActive: {borderColor: c.primary, backgroundColor: c.surfaceAlt},
    // `flexShrink` autorise le bloc texte à se compresser avant l'icône : sans
    // lui, un libellé long pousse l'icône hors de la tuile.
    texts: {flexShrink: 1, gap: 2},
    count: {color: c.text, fontSize: 26, fontWeight: '800', lineHeight: 30},
    label: {fontSize: 13, fontWeight: '600'},
  });
