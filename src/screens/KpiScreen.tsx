import React, {useMemo, useRef} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useScrollToTop} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';

import {categoryLabel, type Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {useConnectivity} from '@/hooks/useConnectivity';
import {dashboardApi} from '@/services/api/dashboard.api';
import {metaRepo} from '@/services/db/database';

export function KpiScreen() {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {online} = useConnectivity();
  const eventId = metaRepo.get('assignedEventId');

  const {data, isLoading, isError, refetch} = useQuery({
    queryKey: ['carbon', eventId],
    queryFn: () => dashboardApi.carbonFootprint(eventId as string),
    enabled: Boolean(eventId) && online,
  });

  /*
   * Un appui sur l'onglet déjà actif ramène la liste en haut : comportement
   * standard iOS/Android, fourni par React Navigation. Le hook n'agit que si
   * l'écran est déjà au premier plan — il n'interfère pas avec la navigation.
   */
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.title}>Empreinte carbone</Text>

      {!online ? (
        <Text style={styles.muted}>Hors ligne — les KPI se chargent en ligne.</Text>
      ) : isLoading ? (
        <ActivityIndicator color={c.primary} style={{marginTop: 24}} />
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
              <Text style={styles.catName}>{categoryLabel(cat)}</Text>
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
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, backgroundColor: c.bg},
  title: {color: c.text, fontSize: 22, fontWeight: '800', marginBottom: 12},
  muted: {color: c.textMuted, marginTop: 16},
  error: {color: c.danger, marginTop: 16},
  hero: {backgroundColor: c.surface, borderRadius: 14, padding: 20, alignItems: 'center'},
  heroValue: {color: c.success, fontSize: 40, fontWeight: '800'},
  heroLabel: {color: c.textMuted, marginTop: 4},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12},
  stat: {backgroundColor: c.surface, borderRadius: 10, padding: 14, minWidth: 100, flex: 1},
  statValue: {color: c.text, fontSize: 22, fontWeight: '800'},
  statLabel: {color: c.textMuted, fontSize: 12, marginTop: 2},
  section: {color: c.textMuted, marginTop: 22, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  catRow: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 8, padding: 12, marginBottom: 6},
  catName: {color: c.text},
  catVal: {color: c.text, fontWeight: '600'},
});
