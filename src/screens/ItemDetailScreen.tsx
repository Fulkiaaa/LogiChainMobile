import React, {useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {AlertTriangle, PackageX} from 'lucide-react-native';
import {useQuery} from '@tanstack/react-query';

import {ReportSheet} from '@/components/ReportSheet';
import {StatusBadge} from '@/components/StatusBadge';
import type {ReportKind} from '@/domain/anomaly';
import {STATUS_LABELS, type Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {itemsApi} from '@/services/api/items.api';
import {itemsRepo} from '@/services/db/database';
import type {RootScreenProps} from '@/navigation/types';

export function ItemDetailScreen({route}: RootScreenProps<'ItemDetail'>) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {id} = route.params;
  const [sheet, setSheet] = useState<ReportKind | null>(null);
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

      <Text style={styles.section}>Signalement terrain</Text>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={() => setSheet('anomaly')}>
          <AlertTriangle color={c.warning} size={17} strokeWidth={2.5} />
          <Text style={styles.actionText}>Signaler une anomalie</Text>
        </Pressable>
        <Pressable
          style={[styles.action, styles.actionDanger]}
          onPress={() => setSheet('lost')}>
          <PackageX color={c.danger} size={17} strokeWidth={2.5} />
          <Text style={[styles.actionText, styles.actionTextDanger]}>Déclarer perdu</Text>
        </Pressable>
      </View>
      <Text style={styles.offlineHint}>
        Fonctionne hors ligne : la position est capturée par le GPS et l’action attend la synchro.
      </Text>

      <ReportSheet
        visible={sheet !== null}
        kind={sheet ?? 'anomaly'}
        itemId={id}
        onClose={() => setSheet(null)}
        onDone={msg => Alert.alert('Enregistré', msg)}
      />

      <Text style={styles.section}>Historique</Text>
      {isLoading ? (
        <ActivityIndicator color={c.primary} />
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, backgroundColor: c.bg},
  label: {color: c.text, fontSize: 24, fontWeight: '800', marginBottom: 8},
  meta: {color: c.textMuted, marginTop: 4},
  section: {color: c.textMuted, marginTop: 22, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  histRow: {backgroundColor: c.surface, borderRadius: 8, padding: 12, marginBottom: 6},
  histType: {color: c.text, fontWeight: '600'},
  histMeta: {color: c.textMuted, fontSize: 12, marginTop: 2},
  muted: {color: c.textMuted},
  actions: {flexDirection: 'row', gap: 10},
  action: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  actionDanger: {borderColor: c.danger},
  actionText: {color: c.text, fontWeight: '600', fontSize: 13, flexShrink: 1},
  actionTextDanger: {color: c.danger},
  offlineHint: {color: c.textMuted, fontSize: 12, marginTop: 8, lineHeight: 17},
});
