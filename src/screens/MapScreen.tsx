import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import {Layers, LocateFixed, Maximize2} from '@/components/icons';
import MapView, {Marker, Polygon, Polyline, PROVIDER_DEFAULT} from 'react-native-maps';
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
import {shouldAutoLocate} from '@/domain/mapFraming';
import {useTheme} from '@/hooks/useTheme';
import {useItems} from '@/hooks/useItems';
import {eventsRepo, routesRepo, zonesRepo} from '@/services/db/database';
import {orderedStops, routePath, toRouteView} from '@/domain/route';
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
  const focusRouteId = route.params?.focusRouteId;
  const {items, eventId} = useItems();
  const [showItems, setShowItems] = useState(true);
  const [locating, setLocating] = useState(false);
  // MapKit signale la fin de sa mise en page. Avant ça, toute commande de
  // caméra est perdue — voir le commentaire de `shouldAutoLocate`.
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<MapView>(null);

  /*
   * La position est relevée deux fois au plus : une à l'ouverture, une par
   * appui sur le bouton cible. Jamais de suivi continu — il viderait la
   * batterie sur une journée de terrain, pour un besoin qui reste ponctuel.
   */

  /** Relevé GPS ponctuel. Lève si la position est indisponible ou illisible. */
  const releverPosition = useCallback(async (): Promise<LatLng> => {
    const here = pointToLatLng(await getCurrentPosition());
    if (!here) {
      throw new Error('Position illisible.');
    }
    return here;
  }, []);

  /** 300 m : on se voit, et on voit ce qu'il y a autour. */
  const cadrerSur = useCallback((here: LatLng) => {
    mapRef.current?.animateToRegion(focusRegion(here, 300), 500);
  }, []);

  const goToMyPosition = useCallback(async () => {
    setLocating(true);
    try {
      cadrerSur(await releverPosition());
    } catch (e) {
      // Geste explicite : l'échec doit être dit.
      Alert.alert(
        'Position indisponible',
        e instanceof Error ? e.message : 'Impossible de vous localiser.',
      );
    } finally {
      setLocating(false);
    }
  }, [releverPosition, cadrerSur]);

  /*
   * Recentrage à l'ouverture.
   *
   * La carte s'affiche IMMÉDIATEMENT sur le secteur, puis glisse vers la
   * position dès que le GPS répond : attendre le relevé avant le premier rendu
   * laisserait un écran vide une à deux secondes, ce qui se remarque bien plus
   * qu'un léger déplacement de caméra.
   *
   * Un seul relevé, jamais de suivi continu : la contrainte batterie du sujet
   * reste tenue.
   */
  const userMovedMap = useRef(false);
  const alreadyLocated = useRef(false);
  /** Évite deux relevés simultanés si l'effet est réévalué pendant l'attente. */
  const locateEnCours = useRef(false);

  useEffect(() => {
    if (
      locateEnCours.current ||
      !shouldAutoLocate({
        focusItemId,
        focusRouteId,
        userMovedMap: userMovedMap.current,
        alreadyLocated: alreadyLocated.current,
        mapReady,
      })
    ) {
      return;
    }
    locateEnCours.current = true;

    let annule = false;
    void (async () => {
      try {
        const here = await releverPosition();
        // Re-vérifié APRÈS l'attente du GPS : l'agent a pu faire glisser la
        // carte entre-temps, et sa manipulation prime sur notre recentrage.
        if (annule || userMovedMap.current) {
          return;
        }
        cadrerSur(here);
        // Marqué APRÈS le succès : un relevé qui échoue ne doit pas condamner
        // la tentative suivante. C'était le défaut de la première version.
        alreadyLocated.current = true;
      } catch {
        // Silence volontaire : personne n'a rien demandé. La vue du secteur
        // reste un repli utilisable, et une alerte non sollicitée à chaque
        // ouverture serait insupportable en zone blanche.
      } finally {
        locateEnCours.current = false;
      }
    })();

    return () => {
      annule = true;
    };
  }, [focusItemId, focusRouteId, mapReady, releverPosition, cadrerSur]);

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

  /**
   * La tournée à tracer, si on arrive depuis « Mes tournées ». Lue en base
   * locale comme le reste : le tracé s'affiche hors réseau.
   */
  const tournee = useMemo(() => {
    if (!focusRouteId) {
      return null;
    }
    const r = routesRepo.findById(focusRouteId);
    if (!r) {
      return null;
    }
    return {view: toRouteView(r), path: routePath(r.stops), stops: orderedStops(r.stops)};
  }, [focusRouteId]);

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
  /*
   * Priorité de cadrage : un équipement précis, puis le trajet d'une tournée,
   * puis le secteur entier. On ouvre toujours sur ce qui a été demandé.
   */
  const region: MapRegion | null = focused
    ? focusRegion({latitude: focused.lat as number, longitude: focused.lng as number})
    : (tournee && tournee.path.length >= 2 ? boundingRegion(tournee.path) : null) ?? overview;

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
        onMapReady={() => setMapReady(true)}
        // `isGesture` distingue un déplacement fait au doigt de nos propres
        // `animateToRegion` : sans lui, notre recentrage s'annulerait lui-même.
        onRegionChangeComplete={(_r, details) => {
          if (details?.isGesture) {
            userMovedMap.current = true;
          }
        }}
        showsUserLocation
        // Le bouton natif ferait doublon avec le nôtre, et ne se place pas
        // au même endroit selon la plateforme.
        showsMyLocationButton={false}>
        {tournee && tournee.path.length >= 2 ? (
          <Polyline
            coordinates={tournee.path}
            strokeColor={c.primary}
            strokeWidth={4}
            // Pointillés tant que la distance est prévisionnelle : le trajet
            // affiché est une intention, pas un relevé.
            lineDashPattern={tournee.view.distanceIsActual ? undefined : [10, 8]}
          />
        ) : null}

        {tournee
          ? tournee.stops.map((st, idx) => {
              const pt = pointToLatLng(st.location);
              return pt ? (
                <Marker
                  key={st.id ?? `stop-${st.sequence}`}
                  coordinate={pt}
                  title={`${idx + 1}. ${st.label}`}
                  description={st.completedAt ? 'Étape terminée' : 'Étape à venir'}
                  pinColor={st.completedAt ? c.success : c.primary}
                />
              ) : null;
            })
          : null}

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
    controls: {position: 'absolute', top: 16, right: 16, gap: 12},
    control: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderStrong,
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
      padding: 16,
      gap: 4,
    },
    panelTitle: {color: c.text, fontWeight: '700', fontSize: 14},
    panelMeta: {color: c.textMuted, fontSize: 12},
  });
