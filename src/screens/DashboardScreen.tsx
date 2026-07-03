import React, {useCallback, useEffect, useState} from 'react';
import {FlatList, Pressable, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {COLORS} from '@/config/theme';
import {useAuth} from '@/hooks/useAuth';
import {useConnectivity} from '@/hooks/useConnectivity';
import {ALL_STATUSES, useItems} from '@/hooks/useItems';
import {useNotificationsSSE} from '@/hooks/useNotificationsSSE';
import {useSync} from '@/hooks/useSync';
import {StatusBadge} from '@/components/StatusBadge';
import {runInitialSync} from '@/services/sync/initialSync';
import type {RootStackParamList} from '@/navigation/types';

export function DashboardScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {user, logout} = useAuth();
  const {online} = useConnectivity();
  const {items, byStatus, eventId, reload} = useItems();
  const {pending} = useSync();
  const {alerts} = useNotificationsSSE();
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');

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

  return (
    <FlatList
      style={styles.container}
      data={items}
      keyExtractor={i => i.id}
      refreshControl={<RefreshControl refreshing={syncState === 'syncing'} onRefresh={reload} tintColor={COLORS.primary} />}
      ListHeaderComponent={
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.hello}>Bonjour, {user?.email ?? 'agent'}</Text>
            <Pressable onPress={logout}>
              <Text style={styles.logout}>Déconnexion</Text>
            </Pressable>
          </View>

          <View style={[styles.banner, {backgroundColor: online ? COLORS.surface : COLORS.warning + '22'}]}>
            <Text style={styles.bannerText}>
              {online ? '🟢 En ligne' : '🔴 Hors ligne'} · {pending} action(s) en attente
            </Text>
          </View>

          {syncState === 'error' ? (
            <Text style={styles.error}>Échec du téléchargement du secteur. Tirez pour réessayer.</Text>
          ) : null}

          <Text style={styles.section}>Stocks par état</Text>
          <View style={styles.statusGrid}>
            {ALL_STATUSES.map(s => (
              <View key={s} style={styles.statusCell}>
                <Text style={styles.statusCount}>{byStatus[s] ?? 0}</Text>
                <StatusBadge status={s} />
              </View>
            ))}
          </View>

          {alerts.length > 0 ? (
            <>
              <Text style={styles.section}>Alertes</Text>
              {alerts.slice(0, 5).map(a => (
                <View key={a.id} style={styles.alert}>
                  <Text style={styles.alertText}>⚠️ {a.message}</Text>
                </View>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>Équipements ({items.length})</Text>
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
      ListEmptyComponent={
        <Text style={styles.empty}>
          {online ? 'Aucun équipement en cache.' : 'Hors ligne — aucun équipement en cache.'}
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.bg, padding: 16},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  hello: {color: COLORS.text, fontSize: 16, fontWeight: '600'},
  logout: {color: COLORS.primary},
  banner: {padding: 12, borderRadius: 10, marginTop: 12},
  bannerText: {color: COLORS.text},
  error: {color: COLORS.danger, marginTop: 8},
  section: {color: COLORS.textMuted, marginTop: 20, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  statusGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  statusCell: {backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, minWidth: 100, gap: 6},
  statusCount: {color: COLORS.text, fontSize: 24, fontWeight: '800'},
  alert: {backgroundColor: COLORS.surface, borderRadius: 8, padding: 10, marginBottom: 6},
  alertText: {color: COLORS.text},
  itemRow: {flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 8},
  itemLabel: {color: COLORS.text, fontWeight: '600'},
  itemQr: {color: COLORS.textMuted, fontSize: 12, marginTop: 2},
  empty: {color: COLORS.textMuted, textAlign: 'center', marginTop: 20},
});
