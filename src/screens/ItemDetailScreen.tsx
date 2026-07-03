import React from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';

import {StatusBadge} from '@/components/StatusBadge';
import {COLORS, STATUS_LABELS} from '@/config/theme';
import {itemsApi} from '@/services/api/items.api';
import {itemsRepo} from '@/services/db/database';
import type {RootScreenProps} from '@/navigation/types';

export function ItemDetailScreen({route}: RootScreenProps<'ItemDetail'>) {
  const {id} = route.params;
  const cached = itemsRepo.findById(id);

  const {data, isLoading} = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemsApi.getById(id),
  });

  const label = data?.label ?? cached?.label ?? id;
  const status = data?.status ?? cached?.status;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.label}>{label}</Text>
      {status ? <StatusBadge status={status} /> : null}
      <Text style={styles.meta}>QR : {data?.qrCode ?? cached?.qrCode}</Text>
      <Text style={styles.meta}>Catégorie : {data?.category ?? cached?.category}</Text>
      <Text style={styles.meta}>Poids : {data?.weightKg ?? cached?.weightKg} kg</Text>

      <Text style={styles.section}>Historique</Text>
      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} />
      ) : data && data.history.length > 0 ? (
        data.history
          .slice()
          .reverse()
          .map((m, i) => (
            <View key={i} style={styles.histRow}>
              <Text style={styles.histType}>{m.type}</Text>
              <Text style={styles.histMeta}>
                {new Date(m.at).toLocaleString('fr-FR')} · {STATUS_LABELS[m.toStatus]}
                {m.note ? ` · ${m.note}` : ''}
              </Text>
            </View>
          ))
      ) : (
        <Text style={styles.muted}>Historique indisponible (hors ligne ou vide).</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  label: {color: COLORS.text, fontSize: 24, fontWeight: '800', marginBottom: 8},
  meta: {color: COLORS.textMuted, marginTop: 4},
  section: {color: COLORS.textMuted, marginTop: 22, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  histRow: {backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 6},
  histType: {color: COLORS.text, fontWeight: '600'},
  histMeta: {color: COLORS.textMuted, fontSize: 12, marginTop: 2},
  muted: {color: COLORS.textMuted},
});
