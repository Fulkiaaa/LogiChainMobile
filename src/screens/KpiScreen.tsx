import React, {useMemo, useRef} from 'react';
import {ActivityIndicator, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useScrollToTop} from '@react-navigation/native';
import {useQuery} from '@tanstack/react-query';

import {categoryLabel, type Palette} from '@/config/theme';
import {carbonShares} from '@/domain/carbonSplit';
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
          {/*
            * Le total porte seul la taille d'affichage : c'est le sujet de
            * l'écran. Aligné à gauche, sur le fond — pas centré dans une carte,
            * qui le mettait à égalité visuelle avec « 4 trajets ».
            */}
          <Text style={styles.total}>{Math.round(data.totalCo2Kg)} kg</Text>
          <Text style={styles.totalLabel}>éq. CO₂ · {data.eventName}</Text>

          <CarbonBar
            manufacturing={data.manufacturingCo2Kg}
            transport={data.transportCo2Kg}
          />

          {/* Décomptes d'inventaire : du contexte, pas un indicateur. */}
          <Text style={styles.context}>
            {data.itemCount} équipement(s) · {data.routeCount} trajet(s)
          </Text>
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

/**
 * Barre de répartition fabrication / transport.
 *
 * Deux segments proportionnels valent mieux que deux nombres côte à côte :
 * l'œil lit « le transport pèse deux fois plus » sans faire la division. Les
 * valeurs restent affichées dessous, parce qu'une proportion seule ne permet
 * pas de comparer deux événements entre eux.
 */
function CarbonBar({manufacturing, transport}: {manufacturing: number; transport: number}) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const parts = carbonShares(manufacturing, transport);

  if (!parts) {
    return null;
  }

  return (
    <View
      style={styles.split}
      accessibilityRole="image"
      // La barre est décorative pour un lecteur d'écran : ce sont les deux
      // lignes de légende qui portent l'information chiffrée.
      accessibilityLabel={`Fabrication ${parts.manufacturing} %, transport ${parts.transport} %`}>
      <View style={styles.bar}>
        <View style={[styles.segment, {flex: parts.manufacturing, backgroundColor: c.primary}]} />
        <View style={[styles.segment, {flex: parts.transport, backgroundColor: c.warning}]} />
      </View>

      <View style={styles.legendRow}>
        <View style={[styles.dot, {backgroundColor: c.primary}]} />
        <Text style={styles.legendName}>Fabrication</Text>
        <Text style={styles.legendValue}>
          {Math.round(manufacturing)} kg · {parts.manufacturing} %
        </Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.dot, {backgroundColor: c.warning}]} />
        <Text style={styles.legendName}>Transport</Text>
        <Text style={styles.legendValue}>
          {Math.round(transport)} kg · {parts.transport} %
        </Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, backgroundColor: c.bg},
  title: {color: c.text, fontSize: 21, fontWeight: '800', marginBottom: 12},
  muted: {color: c.textMuted, marginTop: 16},
  error: {color: c.danger, marginTop: 16},
  total: {color: c.text, fontSize: 40, lineHeight: 46, fontWeight: '800', letterSpacing: -1},
  totalLabel: {color: c.textMuted, fontSize: 14, marginTop: 4},
  context: {color: c.textMuted, fontSize: 12, marginTop: 16},
  split: {marginTop: 24, gap: 8},
  bar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: c.surface,
    marginBottom: 4,
  },
  segment: {height: '100%'},
  legendRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  dot: {width: 8, height: 8, borderRadius: 4},
  legendName: {color: c.text, fontSize: 14, flex: 1},
  legendValue: {color: c.textMuted, fontSize: 14, fontVariant: ['tabular-nums']},
  section: {color: c.textMuted, marginTop: 24, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  catRow: {flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 8, padding: 12, marginBottom: 8},
  catName: {color: c.text},
  catVal: {color: c.text, fontWeight: '600'},
});
