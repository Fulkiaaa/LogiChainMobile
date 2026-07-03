import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {COLORS} from '@/config/theme';
import type {ScanMode} from '@/domain/scanAction';

const MODES: {key: ScanMode; label: string}[] = [
  {key: 'deploy', label: '📥 Déploiement'},
  {key: 'transit', label: '🚚 Transit'},
  {key: 'pointage', label: '📍 Pointage'},
];

export function ModeSelector({mode, onChange}: {mode: ScanMode; onChange: (m: ScanMode) => void}) {
  return (
    <View style={styles.row}>
      {MODES.map(m => {
        const active = m.key === mode;
        return (
          <Pressable
            key={m.key}
            onPress={() => onChange(m.key)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text style={[styles.label, active && styles.labelActive]}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 8},
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.7)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  chipActive: {backgroundColor: COLORS.primary, borderColor: COLORS.primary},
  label: {color: COLORS.text, fontWeight: '600', fontSize: 13},
  labelActive: {color: '#0f172a'},
});
