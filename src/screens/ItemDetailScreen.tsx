import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {AlertTriangle, MapPin, MapPinned, PackageX, Wrench} from '@/components/icons';
import {useQuery} from '@tanstack/react-query';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ReportSheet} from '@/components/ReportSheet';
import {StatusBadge} from '@/components/StatusBadge';
import type {ReportKind} from '@/domain/anomaly';
import {can, whyNot} from '@/domain/capabilities';
import {useAuth} from '@/hooks/useAuth';
import {toItemDetail} from '@/domain/itemDetail';
import {CATEGORY_LABELS, type Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {itemsApi} from '@/services/api/items.api';
import {itemsRepo, outboxRepo} from '@/services/db/database';
import {changeBus} from '@/services/store/changeBus';
import type {RootScreenProps, RootStackParamList} from '@/navigation/types';

export function ItemDetailScreen({route}: RootScreenProps<'ItemDetail'>) {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {id} = route.params;
  const [sheet, setSheet] = useState<ReportKind | null>(null);
  // Miroir du requireRole côté API : on n'affiche pas un geste qui finirait
  // en 403 (que `decideReconcile` ne sait pas expliquer à l'utilisateur).
  const {user} = useAuth();
  const peutMaintenir = can(user?.role, 'maintenance');
  const refusMaintenance = whyNot(user?.role, 'maintenance');

  const {data, isLoading} = useQuery({
    queryKey: ['item', id],
    queryFn: () => itemsApi.getById(id),
  });

  /*
   * Les repos SQLite sont synchrones et hors de React : une écriture locale
   * (scan, signalement, synchro) ne provoque aucun rendu par elle-même. Ce
   * compteur, incrémenté par le bus, force la relecture du cache — sinon une
   * fiche laissée ouverte affiche indéfiniment l'état d'avant le geste.
   */
  const [localRev, setLocalRev] = useState(0);
  useEffect(() => {
    const bump = () => setLocalRev((n) => n + 1);
    const offItems = changeBus.subscribe('items', bump);
    const offOutbox = changeBus.subscribe('outbox', bump);
    return () => {
      offItems();
      offOutbox();
    };
  }, []);

  // Tout l'arbitrage serveur/cache vit dans `toItemDetail`, testé à part.
  const v = useMemo(
    () => toItemDetail(id, data, itemsRepo.findById(id), outboxRepo.hasPendingFor(id)),
    // `localRev` n'est pas lu ici : il sert uniquement à réévaluer le memo
    // après une écriture locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, data, localRev],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <Text style={styles.label}>{v.label}</Text>
      <View style={styles.headRow}>
        {v.status ? <StatusBadge status={v.status} /> : null}
        {v.qrCode ? <Text style={styles.qr}>{v.qrCode}</Text> : null}
      </View>

      {v.offlineOnly && !isLoading ? (
        <Text style={styles.offlineBanner}>
          Données locales. L’historique et les données d’achat remonteront à la synchro.
        </Text>
      ) : null}

      {v.pendingSync ? (
        <Text style={styles.offlineBanner}>
          Statut en attente de synchronisation : le serveur ne connaît pas encore ce geste.
        </Text>
      ) : null}

      <Text style={styles.section}>Caractéristiques</Text>
      <View style={styles.card}>
        <Row label="Catégorie" value={v.category ? CATEGORY_LABELS[v.category] : null} styles={styles} />
        <Row label="Poids" value={v.weightKg !== null ? `${v.weightKg} kg` : null} styles={styles} />
        <Row
          label="Valeur d’achat"
          value={v.purchasePriceEur !== null ? `${v.purchasePriceEur} €` : null}
          styles={styles}
        />
        <Row
          label="Durée de vie"
          value={v.lifespanYears !== null ? `${v.lifespanYears} ans` : null}
          styles={styles}
        />
        <Row
          label="CO₂ de fabrication"
          value={v.manufacturingCo2Kg !== null ? `${v.manufacturingCo2Kg} kg éq. CO₂` : null}
          styles={styles}
        />
        <Row label="Version" value={v.version !== null ? `v${v.version}` : null} styles={styles} last />
      </View>

      <Text style={styles.section}>Position</Text>
      <View style={styles.card}>
        <View style={[styles.geoRow, v.coords && styles.geoRowWithAction]}>
          <MapPin color={v.coords ? c.primary : c.textMuted} size={16} strokeWidth={2.5} />
          <Text style={v.coords ? styles.geoText : styles.muted}>
            {v.coords ?? 'Équipement non localisé'}
          </Text>
        </View>
        {/* Le bouton n'apparaît que si on a une position : proposer « voir sur
            la carte » sans coordonnées ouvrirait une carte vide. */}
        {v.coords ? (
          <Pressable
            style={styles.mapButton}
            accessibilityRole="button"
            accessibilityLabel="Voir cet équipement sur la carte"
            onPress={() => nav.navigate('Map', {focusItemId: id})}>
            <MapPinned color={c.onPrimary} size={16} strokeWidth={2.5} />
            <Text style={styles.mapButtonText}>Voir sur la carte</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.section}>Signalement terrain</Text>
      <View style={styles.actions}>
        <Pressable
            accessibilityRole="button" style={styles.action} onPress={() => setSheet('anomaly')}>
          <AlertTriangle color={c.warning} size={17} strokeWidth={2.5} />
          <Text style={styles.actionText}>Signaler une anomalie</Text>
        </Pressable>
        {peutMaintenir ? (
          <Pressable
            accessibilityRole="button" style={styles.action} onPress={() => setSheet('maintenance')}>
            <Wrench color={c.textMuted} size={17} strokeWidth={2.5} />
            <Text style={styles.actionText}>Mettre en maintenance</Text>
          </Pressable>
        ) : null}
        <Pressable
            accessibilityRole="button"
          style={[styles.action, styles.actionDanger]}
          onPress={() => setSheet('lost')}>
          <PackageX color={c.danger} size={17} strokeWidth={2.5} />
          <Text style={[styles.actionText, styles.actionTextDanger]}>Déclarer perdu</Text>
        </Pressable>
      </View>
      <Text style={styles.offlineHint}>
        Fonctionne hors ligne : la position est capturée par le GPS et l’action attend la synchro.
      </Text>
      {refusMaintenance ? (
        <Text style={styles.offlineHint}>Mise en maintenance — {refusMaintenance}</Text>
      ) : null}

      <ReportSheet
        visible={sheet !== null}
        kind={sheet ?? 'anomaly'}
        itemId={id}
        onClose={() => setSheet(null)}
        onDone={msg => Alert.alert('Enregistré', msg)}
      />

      <Text style={styles.section}>Historique ({v.movements.length})</Text>
      {isLoading ? (
        <ActivityIndicator color={c.primary} />
      ) : v.movements.length > 0 ? (
        v.movements.map((m, i) => (
          <View key={i} style={styles.histRow}>
            {/* Filet vertical : relie les entrées entre elles, ce qui se lit
                comme une frise sans coûter un composant de plus. */}
            <View style={styles.histRail}>
              <View style={styles.histDot} />
              {i < v.movements.length - 1 ? <View style={styles.histLine} /> : null}
            </View>
            <View style={styles.histBody}>
              <View style={styles.histHead}>
                <Text style={styles.histType}>{m.title}</Text>
                {m.hasLocation ? (
                  <MapPin color={c.textMuted} size={12} strokeWidth={2.5} />
                ) : null}
              </View>
              <Text style={styles.histMeta}>{m.at}</Text>
              {m.transition ? <Text style={styles.histTransition}>{m.transition}</Text> : null}
              {m.note ? <Text style={styles.histNote}>« {m.note} »</Text> : null}
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>Aucun mouvement enregistré pour cet équipement.</Text>
      )}
    </ScrollView>
  );
}

/** Ligne libellé / valeur. `—` plutôt qu'une ligne absente : l'absence de
 *  donnée est elle-même une information, surtout hors ligne. */
function Row({
  label,
  value,
  styles,
  last,
}: {
  label: string;
  value: string | null;
  styles: ReturnType<typeof makeStyles>;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={value ? styles.rowValue : styles.rowValueEmpty}>{value ?? '—'}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: c.bg},
    label: {color: c.text, fontSize: 21, fontWeight: '800', marginBottom: 8},
    headRow: {flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap'},
    qr: {color: c.textMuted, fontSize: 14, fontWeight: '600'},
    offlineBanner: {
      color: c.warning,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 12,
      lineHeight: 17,
    },
    section: {
      color: c.textMuted,
      marginTop: 24,
      marginBottom: 8,
      fontWeight: '700',
      textTransform: 'uppercase',
      fontSize: 12,
    },
    card: {backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 16},
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    rowLast: {borderBottomWidth: 0},
    rowLabel: {color: c.textMuted, fontSize: 14},
    rowValue: {color: c.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right'},
    rowValueEmpty: {color: c.textMuted, fontSize: 14, flexShrink: 1, textAlign: 'right'},
    geoRow: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12},
    geoRowWithAction: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingVertical: 12,
      marginVertical: 12,
    },
    mapButtonText: {color: c.onPrimary, fontWeight: '700', fontSize: 14},
    geoText: {color: c.text, fontSize: 14, fontWeight: '600'},
    muted: {color: c.textMuted},
    histRow: {flexDirection: 'row', gap: 12},
    histRail: {width: 10, alignItems: 'center'},
    histDot: {width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary, marginTop: 4},
    histLine: {flex: 1, width: 2, backgroundColor: c.border, marginTop: 4},
    histBody: {flex: 1, paddingBottom: 16},
    histHead: {flexDirection: 'row', alignItems: 'center', gap: 8},
    histType: {color: c.text, fontWeight: '700', fontSize: 14},
    histMeta: {color: c.textMuted, fontSize: 12, marginTop: 4},
    histTransition: {color: c.primary, fontSize: 12, fontWeight: '600', marginTop: 4},
    histNote: {color: c.text, fontSize: 14, fontStyle: 'italic', marginTop: 4},
    actions: {flexDirection: 'row', gap: 12},
    action: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.borderStrong,
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    actionDanger: {borderColor: c.danger},
    actionText: {color: c.text, fontWeight: '600', fontSize: 14, flexShrink: 1},
    actionTextDanger: {color: c.danger},
    offlineHint: {color: c.textMuted, fontSize: 12, marginTop: 12, lineHeight: 17},
  });
