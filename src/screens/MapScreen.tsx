import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import MapView, {Marker, Polygon, PROVIDER_DEFAULT} from 'react-native-maps';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {STATUS_LABELS, type Palette} from '@/config/theme';
import {boundingRegion, polygonToLatLng, ZONE_COLORS, type LatLng} from '@/domain/mapGeometry';
import {useTheme} from '@/hooks/useTheme';
import {useItems} from '@/hooks/useItems';
import {eventsRepo, zonesRepo} from '@/services/db/database';
import type {RootStackParamList} from '@/navigation/types';

/**
 * Carte du secteur assigné. Tout est lu depuis SQLite — zones et coordonnées
 * des équipements sont mises en cache à la synchro initiale, donc l'écran
 * fonctionne intégralement hors réseau (seul le fond de carte Apple exige une
 * connexion, et iOS sert ses propres tuiles en cache).
 */
export function MapScreen() {
  const {c, statusColors} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {items, eventId} = useItems();
  const [showItems, setShowItems] = useState(true);

  const zones = useMemo(() => {
    if (!eventId) {
      return [];
    }
    return zonesRepo.listByEvent(eventId).map(z => ({
      id: z.id,
      name: z.name,
      category: z.category,
      points: polygonToLatLng(safeParse(z.area)),
    }));
  }, [eventId]);

  const placed = useMemo(
    () => items.filter(i => i.lat !== null && i.lng !== null),
    [items],
  );

  // Le cadre couvre l'ensemble : zones ET équipements, pour n'en cacher aucun.
  const region = useMemo(() => {
    const pts: LatLng[] = [
      ...zones.flatMap(z => z.points),
      ...placed.map(i => ({latitude: i.lat as number, longitude: i.lng as number})),
    ];
    return boundingRegion(pts);
  }, [zones, placed]);

  const eventName = eventId ? (eventsRepo.findById(eventId)?.name ?? null) : null;

  if (!region) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Aucune donnée cartographique en cache. Synchronisez le secteur depuis le tableau de bord.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView provider={PROVIDER_DEFAULT} style={StyleSheet.absoluteFill} initialRegion={region}>
        {zones.map(z => {
          const tint = ZONE_COLORS[z.category] ?? ZONE_COLORS.default;
          return z.points.length >= 3 ? (
            <Polygon
              key={z.id}
              coordinates={z.points}
              strokeColor={tint}
              fillColor={tint + '33'}
              strokeWidth={2}
            />
          ) : null;
        })}

        {showItems &&
          placed.map(i => (
            <Marker
              key={i.id}
              coordinate={{latitude: i.lat as number, longitude: i.lng as number}}
              pinColor={statusColors[i.status]}
              title={i.label}
              description={`${i.qrCode} · ${STATUS_LABELS[i.status]}`}
              onCalloutPress={() => nav.navigate('ItemDetail', {id: i.id})}
            />
          ))}
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{eventName ?? 'Secteur'}</Text>
        <Text style={styles.panelMeta}>
          {zones.length} zone(s) · {placed.length} équipement(s) localisé(s)
        </Text>
        <Pressable style={styles.toggle} onPress={() => setShowItems(v => !v)}>
          <Text style={styles.toggleText}>
            {showItems ? 'Masquer les équipements' : 'Afficher les équipements'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: {flex: 1, backgroundColor: c.bg},
    empty: {flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 32},
    emptyText: {color: c.textMuted, textAlign: 'center', lineHeight: 20},
    panel: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 24,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 4,
    },
    panelTitle: {color: c.text, fontWeight: '700', fontSize: 15},
    panelMeta: {color: c.textMuted, fontSize: 12},
    toggle: {
      marginTop: 8,
      backgroundColor: c.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    toggleText: {color: c.onPrimary, fontWeight: '700', fontSize: 13},
  });
