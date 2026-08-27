import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {CircleCheck, Flag, MapPinned, Package, Route as RouteIcon, Truck} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {TOUCH_MIN, type Palette} from '@/config/theme';
import {STOP_TYPE_LABELS, nextStop, orderedStops, toRouteView} from '@/domain/route';
import {useTheme} from '@/hooks/useTheme';
import type {RootStackParamList} from '@/navigation/types';
import {metaRepo, routesRepo} from '@/services/db/database';
import {changeBus} from '@/services/store/changeBus';
import type {RouteJSON} from '@/types/api';

/** Heure seule : la date complète alourdit une liste d'étapes d'une même journée. */
function heure(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  // Formatage manuel : Hermes n'embarque pas toujours ICU.
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}h${m}`;
}

export function RoutesScreen() {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [routes, setRoutes] = useState<RouteJSON[]>([]);
  const [ouverte, setOuverte] = useState<string | null>(null);

  // Lecture 100 % locale : une feuille de route se consulte sur la route,
  // c'est-à-dire là où le réseau manque.
  const reload = useCallback(() => {
    const ev = metaRepo.get('assignedEventId');
    setRoutes(ev ? routesRepo.listByEvent(ev) : []);
  }, []);

  useEffect(() => {
    reload();
    return changeBus.subscribe('items', reload);
  }, [reload]);

  if (routes.length === 0) {
    return (
      <View style={styles.empty}>
        <RouteIcon color={c.textMuted} size={28} strokeWidth={1.8} />
        <Text style={styles.emptyText}>
          Aucune tournée en cache. Retéléchargez le secteur depuis le centre de synchronisation.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {routes.map(r => {
        const v = toRouteView(r);
        const suivante = nextStop(r.stops);
        const depliee = ouverte === r.id;
        return (
          <View key={r.id} style={styles.card}>
            <Pressable
              testID={`route-${r.id}`}
              accessibilityRole="button"
              onPress={() => setOuverte(depliee ? null : r.id)}>
              <View style={styles.head}>
                <Truck color={c.primary} size={18} strokeWidth={2.5} />
                <Text style={styles.ref}>{v.reference}</Text>
                <Text style={styles.status}>{v.statusLabel}</Text>
              </View>

              <Text style={styles.meta}>
                {v.modeLabel} · {v.distanceKm} km{' '}
                <Text style={v.distanceIsActual ? styles.reel : styles.prevu}>
                  {v.distanceIsActual ? 'relevés' : 'prévus'}
                </Text>
                {' · '}
                {v.weightTonnes.toFixed(1)} t
              </Text>

              <Text style={styles.meta}>
                {v.stopCount} étape(s) · {v.itemCount} équipement(s) affecté(s)
              </Text>

              {suivante ? (
                <View style={styles.next}>
                  <Flag color={c.warning} size={14} strokeWidth={2.5} />
                  <Text style={styles.nextText}>
                    Prochaine étape : {suivante.label} · {heure(suivante.scheduledAt)}
                  </Text>
                </View>
              ) : (
                <View style={styles.next}>
                  <CircleCheck color={c.success} size={14} strokeWidth={2.5} />
                  <Text style={styles.doneText}>Toutes les étapes sont terminées.</Text>
                </View>
              )}
            </Pressable>

            {depliee ? (
              <View style={styles.stops}>
                {orderedStops(r.stops).map(s => (
                  <View key={s.id ?? `${s.sequence}`} style={styles.stop}>
                    <View style={styles.stopDot}>
                      <Text style={styles.stopSeq}>{s.sequence + 1}</Text>
                    </View>
                    <View style={styles.stopBody}>
                      <Text style={styles.stopLabel}>{s.label}</Text>
                      <Text style={styles.stopMeta}>
                        {STOP_TYPE_LABELS[s.type]} · {heure(s.scheduledAt)}
                        {s.completedAt ? ' · terminée' : ''}
                      </Text>
                      {s.itemIds.length > 0 ? (
                        <View style={styles.stopItems}>
                          <Package color={c.textMuted} size={13} strokeWidth={2.2} />
                          <Text style={styles.stopMeta}>{s.itemIds.length} équipement(s)</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}

                <Pressable
                  style={styles.mapBtn}
                  accessibilityRole="button"
                  onPress={() => nav.navigate('Map', {focusRouteId: r.id})}>
                  <MapPinned color={c.primary} size={16} strokeWidth={2.5} />
                  <Text style={styles.mapBtnText}>Tracer sur la carte</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      <Text style={styles.footnote}>
        Ces tournées viennent du cache local : elles restent consultables hors réseau. La distance
        « relevés » est celle qui alimente l'empreinte carbone de transport.
      </Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: c.bg},
    content: {padding: 16, paddingBottom: 32},
    empty: {flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12},
    emptyText: {color: c.textMuted, textAlign: 'center', lineHeight: 20},
    card: {backgroundColor: c.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border},
    head: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8},
    ref: {color: c.text, fontWeight: '700', fontSize: 17, flex: 1},
    status: {color: c.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5},
    meta: {color: c.textMuted, fontSize: 14, marginTop: 4},
    reel: {color: c.success, fontWeight: '600'},
    prevu: {color: c.warning, fontWeight: '600'},
    next: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8},
    nextText: {color: c.text, fontSize: 14, flex: 1},
    doneText: {color: c.success, fontSize: 14, flex: 1},
    stops: {marginTop: 16, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12},
    stop: {flexDirection: 'row', gap: 12, marginBottom: 12},
    stopDot: {width: 24, height: 24, borderRadius: 12, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center'},
    stopSeq: {color: c.text, fontSize: 12, fontWeight: '700'},
    stopBody: {flex: 1},
    stopLabel: {color: c.text, fontWeight: '600'},
    stopMeta: {color: c.textMuted, fontSize: 12},
    stopItems: {flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4},
    mapBtn: {
    minHeight: TOUCH_MIN,flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: c.primary, borderRadius: 10, paddingVertical: 12, marginTop: 4},
    mapBtnText: {color: c.primary, fontWeight: '700'},
    footnote: {color: c.textMuted, fontSize: 12, lineHeight: 17, marginTop: 4},
  });
