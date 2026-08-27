import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {STATUS_LABELS} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import type {ItemStatus} from '@/types/api';

export function StatusBadge({status}: {status: ItemStatus}) {
  const {statusColors} = useTheme();
  const tint = statusColors[status];
  return (
    <View style={[styles.badge, {backgroundColor: tint + '22', borderColor: tint}]}>
      <Text style={[styles.text, {color: tint}]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {fontSize: 12, fontWeight: '600'},
});
