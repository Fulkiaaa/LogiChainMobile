import React from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useQuery} from '@tanstack/react-query';

import {COLORS} from '@/config/theme';
import {useConnectivity} from '@/hooks/useConnectivity';
import {dashboardApi} from '@/services/api/dashboard.api';
import {metaRepo} from '@/services/db/database';

export function KpiScreen() {
  const {online} = useConnectivity();
  const eventId = metaRepo.get('assignedEventId');

  const {data, isLoading, isError, refetch} = useQuery({
    queryKey: ['carbon', eventId],
    queryFn: () => dashboardApi.carbonFootprint(eventId as string),
    enabled: Boolean(eventId) && online,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.title}>Empreinte carbone</Text>

      {!online ? (
        <Text style={styles.muted}>Hors ligne — les KPI se chargent en ligne.</Text>
      ) : isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{marginTop: 24}} />
      ) : isError ? (
        <Text style={styles.error} onPress={() => refetch()}>
          Erreur de chargement. Toucher pour réessayer.
        </Text>
      ) : data ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroValue}>{Math.round(data.totalCo2Kg)} kg</Text>
            <Text style={styles.heroLabel}>CO₂ total · {data.eventName}</Text>
          </View>
          <View style={styles.grid}>
            <Stat label="Fabrication" value={`${Math.round(data.manufacturingCo2Kg)} kg`} />
            <Stat label="Transport" value={`${Math.round(data.transportCo2Kg)} kg`} />
            <Stat label="Équipements" value={String(data.itemCount)} />
            <Stat label="Trajets" value={String(data.routeCount)} />
          </View>
          <Text style={styles.section}>Par catégorie</Text>
          {Object.entries(data.byCategory).map(([cat, kg]) => (
            <View key={cat} style={styles.catRow}>
              <Text style={styles.catName}>{cat}</Text>
              <Text style={styles.catVal}>{Math.round(kg)} kg</Text>
            </View>
          ))}
        </>
      ) : (
        <Text style={styles.muted}>Aucun secteur assigné.</Text>
      )}
    </ScrollView>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg},
  title: {color: COLORS.text, fontSize: 22, fontWeight: '800', marginBottom: 12},
  muted: {color: COLORS.textMuted, marginTop: 16},
  error: {color: COLORS.danger, marginTop: 16},
  hero: {backgroundColor: COLORS.surface, borderRadius: 14, padding: 20, alignItems: 'center'},
  heroValue: {color: COLORS.success, fontSize: 40, fontWeight: '800'},
  heroLabel: {color: COLORS.textMuted, marginTop: 4},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12},
  stat: {backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, minWidth: 100, flex: 1},
  statValue: {color: COLORS.text, fontSize: 22, fontWeight: '800'},
  statLabel: {color: COLORS.textMuted, fontSize: 12, marginTop: 2},
  section: {color: COLORS.textMuted, marginTop: 22, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  catRow: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 6},
  catName: {color: COLORS.text},
  catVal: {color: COLORS.text, fontWeight: '600'},
});
