import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View} from 'react-native';
import {useNavigation, useScrollToTop} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {AlertTriangle, Info, Map as MapIcon, Search, ShieldAlert, SlidersHorizontal, X} from 'lucide-react-native';

import {ConnectivityBadge} from '@/components/ConnectivityBadge';
import type {Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {useAuth} from '@/hooks/useAuth';
import {useConnectivity} from '@/hooks/useConnectivity';
import {ALL_STATUSES, useItems} from '@/hooks/useItems';
import {useNotificationsSSE} from '@/hooks/useNotificationsSSE';
import {useSync} from '@/hooks/useSync';
import {StatusBadge} from '@/components/StatusBadge';
import {StatusTile} from '@/components/StatusTile';
import {FilterSheet, type FilterState} from '@/components/FilterSheet';
import {DEFAULT_SORT, activeFilterCount, filterItems, sortItems} from '@/domain/itemFilter';
import type {ItemStatus} from '@/types/api';
import {runInitialSync} from '@/services/sync/initialSync';
import type {RootStackParamList} from '@/navigation/types';

export function DashboardScreen() {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user} = useAuth();
  const {online} = useConnectivity();
  const {items, byStatus, eventId, reload} = useItems();
  const {pending} = useSync();
  const {alerts} = useNotificationsSSE();
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [statusFilter, setStatusFilter] = useState<ItemStatus | null>(null);
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [advanced, setAdvanced] = useState<FilterState>({category: null, sort: DEFAULT_SORT});

  const visible = useMemo(
    () =>
      sortItems(
        filterItems(items, {status: statusFilter, query, category: advanced.category}),
        advanced.sort,
      ),
    [items, statusFilter, query, advanced],
  );
  const advancedCount = activeFilterCount(advanced);
  const filtering = statusFilter !== null || query.trim() !== '' || advancedCount > 0;

  const bootstrap = useCallback(async () => {
    if (eventId || !online) {
      return;
    }
    setSyncState('syncing');
    try {
      await runInitialSync();
      reload();
      setSyncState('idle');
    } catch {
      setSyncState('error');
    }
  }, [eventId, online, reload]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  /*
   * Un appui sur l'onglet déjà actif ramène la liste en haut : comportement
   * standard iOS/Android, fourni par React Navigation. Le hook n'agit que si
   * l'écran est déjà au premier plan — il n'interfère pas avec la navigation.
   */
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  return (
    <FlatList
      ref={listRef}
      style={styles.container}
      data={visible}
      keyExtractor={i => i.id}
      refreshControl={<RefreshControl refreshing={syncState === 'syncing'} onRefresh={reload} tintColor={c.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.hello}>Bonjour, {user?.fullName ?? 'agent'}</Text>
            <Pressable style={styles.mapLink} onPress={() => nav.navigate('Map')}>
              <MapIcon color={c.primary} size={16} strokeWidth={2.5} />
              <Text style={styles.mapLinkText}>Carte</Text>
            </Pressable>
          </View>

          <View style={[styles.banner, {backgroundColor: online ? c.surface : c.warning + '22'}]}>
            <ConnectivityBadge online={online}>
              {` · ${pending} action(s) en attente`}
            </ConnectivityBadge>
          </View>

          {syncState === 'error' ? (
            <Text style={styles.error}>Échec du téléchargement du secteur. Tirez pour réessayer.</Text>
          ) : null}

          <Text style={styles.section}>Stocks par état</Text>
          {[ALL_STATUSES.slice(0, 3), ALL_STATUSES.slice(3, 6)].map((rangee, i) => (
            <View key={i} style={styles.statusRow}>
              {rangee.map(s => (
                <StatusTile
                  key={s}
                  status={s}
                  count={byStatus[s] ?? 0}
                  active={statusFilter === s}
                  onPress={() => setStatusFilter(statusFilter === s ? null : s)}
                />
              ))}
            </View>
          ))}

          {alerts.length > 0 ? (
            <>
              <Text style={styles.section}>Alertes</Text>
              {alerts.slice(0, 5).map(a => {
                const tint =
                  a.severity === 'critical' ? c.danger : a.severity === 'warning' ? c.warning : c.primary;
                const Icon =
                  a.severity === 'critical' ? ShieldAlert : a.severity === 'warning' ? AlertTriangle : Info;
                return (
                  <View
                    key={a.id}
                    style={[styles.alert, {backgroundColor: tint + '1f', borderLeftColor: tint}]}>
                    <Icon color={tint} size={18} strokeWidth={2.5} />
                    <View style={styles.alertBody}>
                      <Text style={[styles.alertTitle, {color: tint}]}>{a.title}</Text>
                      <Text style={styles.alertText}>{a.message}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}

          <Text style={styles.section}>
            Équipements ({visible.length}
            {filtering ? ` sur ${items.length}` : ''})
          </Text>

          <View style={styles.searchBar}>
            <View style={styles.searchRow}>
            <Search color={c.textMuted} size={16} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un QR ou un libellé…"
              placeholderTextColor={c.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              value={query}
              onChangeText={setQuery}
            />
            {query.trim() !== '' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => setQuery('')}
                hitSlop={8}>
                <X color={c.textMuted} size={16} strokeWidth={2.5} />
              </Pressable>
            ) : null}
            </View>

            <Pressable
              testID="filter-button"
              accessibilityRole="button"
              accessibilityLabel={
                advancedCount > 0
                  ? `Filtrer et trier, ${advancedCount} filtre(s) actif(s)`
                  : 'Filtrer et trier'
              }
              onPress={() => setSheetOpen(true)}
              style={[styles.filterButton, advancedCount > 0 && styles.filterButtonActive]}>
              <SlidersHorizontal
                color={advancedCount > 0 ? c.onPrimary : c.primary}
                size={18}
                strokeWidth={2.5}
              />
              {advancedCount > 0 ? (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountText}>{advancedCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>
      }
      renderItem={({item}) => (
        <Pressable style={styles.itemRow} onPress={() => nav.navigate('ItemDetail', {id: item.id})}>
          <View style={{flex: 1}}>
            <Text style={styles.itemLabel}>{item.label}</Text>
            <Text style={styles.itemQr}>{item.qrCode}</Text>
          </View>
          <StatusBadge status={item.status} />
        </Pressable>
      )}
      ListFooterComponent={
        <FilterSheet
          visible={sheetOpen}
          category={advanced.category}
          sort={advanced.sort}
          onChange={setAdvanced}
          onClose={() => setSheetOpen(false)}
        />
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {filtering
            ? 'Aucun équipement ne correspond à ce filtre.'
            : online
              ? 'Aucun équipement en cache.'
              : 'Hors ligne — aucun équipement en cache.'}
        </Text>
      }
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, backgroundColor: c.bg, padding: 16},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  hello: {color: c.text, fontSize: 16, fontWeight: '600', flexShrink: 1},
  mapLink: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 10},
  mapLinkText: {color: c.primary, fontWeight: '600'},
  logout: {color: c.primary},
  banner: {padding: 12, borderRadius: 10, marginTop: 12},
  bannerText: {color: c.text},
  error: {color: c.danger, marginTop: 8},
  section: {color: c.textMuted, marginTop: 20, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  // Deux rangées de trois : les tuiles sont en `flex: 1`, donc à largeur égale
  // quelle que soit la longueur du libellé.
  statusRow: {flexDirection: 'row', gap: 10, marginBottom: 10},
  searchBar: {
    flexDirection: 'row',
    // `stretch` plutôt que `center` : le bouton adopte la hauteur exacte de la
    // barre de recherche, quelle que soit la taille de police du système.
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 10,
  },
  filterButton: {
    width: 44,
    // Pas de hauteur fixe : `alignItems: 'stretch'` du parent l'aligne sur
    // l'input. Le rayon reprend celui de la barre pour que les deux blocs se
    // lisent comme une seule rangée.
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  filterButtonActive: {backgroundColor: c.primary, borderColor: c.primary},
  filterCount: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: c.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {color: '#fff', fontSize: 11, fontWeight: '800'},
  searchRow: {
    // Occupe toute la largeur restante à gauche du bouton de filtre (44 px).
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: c.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 12,
  },
  searchInput: {flex: 1, color: c.text, paddingVertical: 10},
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  alertBody: {flex: 1, gap: 2},
  alertTitle: {fontWeight: '700', fontSize: 13},
  alertText: {color: c.text, flexShrink: 1, fontSize: 13, lineHeight: 18},
  itemRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 10, padding: 14, marginBottom: 8},
  itemLabel: {color: c.text, fontWeight: '600'},
  itemQr: {color: c.textMuted, fontSize: 12, marginTop: 2},
  empty: {color: c.textMuted, textAlign: 'center', marginTop: 20},
});
