import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Wifi, WifiOff} from 'lucide-react-native';

import type {Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';

/** Bandeau « en ligne / hors ligne » partagé par le tableau de bord et l'écran
 *  de synchro. Le texte qui suit l'icône est laissé à l'appelant : les deux
 *  écrans n'affichent pas les mêmes compteurs. */
export function ConnectivityBadge({online, children}: {online: boolean; children: React.ReactNode}) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const Icon = online ? Wifi : WifiOff;
  const tint = online ? c.success : c.danger;
  return (
    <View style={styles.row}>
      <Icon color={tint} size={16} strokeWidth={2.5} />
      <Text style={styles.text}>
        <Text style={{color: tint, fontWeight: '700'}}>{online ? 'En ligne' : 'Hors ligne'}</Text>
        {children}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', gap: 8},
  text: {color: c.text, flexShrink: 1},
});
