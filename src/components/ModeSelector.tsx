import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {MapPin, PackageCheck, Truck} from 'lucide-react-native';

import type {Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import type {ScanMode} from '@/domain/scanAction';

const MODES: {key: ScanMode; label: string; Icon: typeof MapPin}[] = [
  {key: 'deploy', label: 'Déploiement', Icon: PackageCheck},
  {key: 'transit', label: 'Transit', Icon: Truck},
  {key: 'pointage', label: 'Pointage', Icon: MapPin},
];

export function ModeSelector({mode, onChange}: {mode: ScanMode; onChange: (m: ScanMode) => void}) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.row}>
      {MODES.map(({key, label, Icon}) => {
        const active = key === mode;
        const tint = active ? c.onPrimary : c.text;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.chip, active && styles.chipActive]}>
            <Icon color={tint} size={16} strokeWidth={2} />
            <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {flexDirection: 'row', gap: 8},
  chip: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {backgroundColor: c.primary, borderColor: c.primary},
  label: {color: c.text, fontWeight: '600', fontSize: 13},
  labelActive: {color: c.onPrimary},
});
