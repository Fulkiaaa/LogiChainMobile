import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {STATUS_COLORS, STATUS_LABELS} from '@/config/theme';
import type {ItemStatus} from '@/types/api';

export function StatusBadge({status}: {status: ItemStatus}) {
  return (
    <View style={[styles.badge, {backgroundColor: STATUS_COLORS[status] + '33', borderColor: STATUS_COLORS[status]}]}>
      <Text style={[styles.text, {color: STATUS_COLORS[status]}]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {fontSize: 12, fontWeight: '600'},
});
