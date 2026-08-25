import React, {useCallback, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {Layers, LocateFixed, Maximize2} from 'lucide-react-native';
import MapView, {Marker, Polygon, PROVIDER_DEFAULT} from 'react-native-maps';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {STATUS_LABELS, type Palette} from '@/config/theme';
import {
  boundingRegion,
  focusRegion,
  pointToLatLng,
  polygonToLatLng,
  ZONE_COLORS,
  type LatLng,
  type MapRegion,
} from '@/domain/mapGeometry';
import {getCurrentPosition} from '@/services/geo/location';
import {useTheme} from '@/hooks/useTheme';
import {useItems} from '@/hooks/useItems';
import {eventsRepo, zonesRepo} from '@/services/db/database';
import type {RootScreenProps, RootStackParamList} from '@/navigation/types';

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
  const route = useRoute<RootScreenProps<'Map'>['route']>();
  const focusItemId = route.params?.focusItemId;
  const {items, eventId} = useItems();
  const [showItems, setShowItems] = useState(true);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

  /**
   * Recentre sur la position réelle de l'appareil. Relevé à la demande, jamais
   * en continu : un suivi permanent viderait la batterie sur une journée de
   * terrain, pour un besoin qui est ponctuel.
   */
  const goToMyPosition = useCallback(async () => {
    setLocating(true);
    try {
      const here = pointToLatLng(await getCurrentPosition());
      if (!here) {
        throw new Error('Position illisible.');
      }
      // 300 m : on se voit, et on voit ce qu'il y a autour.
      mapRef.current?.animateToRegion(focusRegion(here, 300), 500);
    } catch (e) {
      Alert.alert(
        'Position indisponible',
        e instanceof Error ? e.message : 'Impossible de vous localiser.',
      );
    } finally {
      setLocating(false);
    }
  }, []);

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

  /** L'équipement sur lequel on nous a demandé de centrer, s'il est localisé. */
  const focused = useMemo(
    () => (focusItemId ? (placed.find(i => i.id === focusItemId) ?? null) : null),
    [focusItemId, placed],
  );

  // Le cadre couvre l'ensemble : zones ET équipements, pour n'en cacher aucun.
  const overview = useMemo(() => {
    const pts: LatLng[] = [
      ...zones.flatMap(z => z.points),
      ...placed.map(i => ({latitude: i.lat as number, longitude: i.lng as number})),
    ];
    return boundingRegion(pts);
  }, [zones, placed]);

  /*
   * Arrivé depuis une fiche équipement, on ouvre serré sur lui plutôt que sur
   * tout le secteur : la question posée était « où est-il exactement ».
   */
  const region: MapRegion | null = focused
    ? focusRegion({latitude: focused.lat as number, longitude: focused.lng as number})
    : overview;

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
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation
        // Le bouton natif ferait doublon avec le nôtre, et ne se place pas
        // au même endroit selon la plateforme.
        showsMyLocationButton={false}>
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

      {/* Contrôles de carte, en haut à droite comme dans Plans ou Google Maps.
          Les sortir du panneau lui rend son rôle : informer, pas commander. */}
      <View style={styles.controls}>
        {overview ? (
          <Control
            styles={styles}
            label="Vue d’ensemble du secteur"
            // On déplace la caméra plutôt que de renaviguer : repasser par la
            // navigation rechargerait l'écran et perdrait l'état de la carte.
            onPress={() => mapRef.current?.animateToRegion(overview, 450)}>
            <Maximize2 color={c.text} size={19} strokeWidth={2.2} />
          </Control>
        ) : null}

        <Control
          styles={styles}
          active={showItems}
          label={showItems ? 'Masquer les équipements' : 'Afficher les équipements'}
          onPress={() => setShowItems(v => !v)}>
          <Layers color={showItems ? c.onPrimary : c.text} size={19} strokeWidth={2.2} />
        </Control>

        <Control styles={styles} label="Recentrer sur ma position" onPress={goToMyPosition}>
          {locating ? (
            <ActivityIndicator color={c.primary} size="small" />
          ) : (
            <LocateFixed color={c.primary} size={19} strokeWidth={2.2} />
          )}
        </Control>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{focused ? focused.label : (eventName ?? 'Secteur')}</Text>
        <Text style={styles.panelMeta}>
          {focused
            ? `${focused.qrCode} · ${STATUS_LABELS[focused.status]}`
            : `${zones.length} zone(s) · ${placed.length} équipement(s) localisé(s)`}
        </Text>
      </View>
    </View>
  );
}

/** Bouton de carte rond. Même gabarit pour les trois, pour qu'ils se lisent
 *  comme une seule barre d'outils. */
function Control({
  children,
  label,
  onPress,
  active,
  styles,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  active?: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected: active ?? false}}
      onPress={onPress}
      style={[styles.control, active && styles.controlActive]}>
      {children}
    </Pressable>
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
    controls: {position: 'absolute', top: 16, right: 16, gap: 10},
    control: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      // Le relief détache les boutons du fond de carte, qui peut être clair
      // comme sombre selon la zone survolée.
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 5,
      shadowOffset: {width: 0, height: 2},
      elevation: 3,
    },
    controlActive: {backgroundColor: c.primary, borderColor: c.primary},
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
  });
