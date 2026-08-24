import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {AlertTriangle} from 'lucide-react-native';

import {ConnectivityBadge} from '@/components/ConnectivityBadge';
import type {Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {useConnectivity} from '@/hooks/useConnectivity';
import {useSync} from '@/hooks/useSync';
import {outboxRepo} from '@/services/db/database';
import type {OutboxRow} from '@/services/db/outbox.repo';

export function SyncCenterScreen() {
  const {c} = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const {online} = useConnectivity();
  const {pending, syncing, lastResult, forceSync} = useSync();
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [conflicts, setConflicts] = useState<OutboxRow[]>([]);

  const refresh = useCallback(() => {
    setRows(outboxRepo.listPending());
    setConflicts(outboxRepo.listConflicts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onForce = async () => {
    await forceSync();
    refresh();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding: 16}}>
      <View style={styles.summary}>
        <ConnectivityBadge online={online}>
          {` · ${pending} en attente · ${conflicts.length} conflit(s)`}
        </ConnectivityBadge>
        {lastResult ? (
          <Text style={styles.lastResult}>
            Dernière synchro : {lastResult.synced} OK, {lastResult.conflicts} conflits, {lastResult.failed} échecs
          </Text>
        ) : null}
      </View>

      <Pressable style={[styles.button, (!online || syncing) && styles.buttonDisabled]} onPress={onForce} disabled={!online || syncing}>
        <Text style={styles.buttonText}>{syncing ? 'Synchronisation…' : 'Forcer la synchro'}</Text>
      </Pressable>

      <Text style={styles.section}>File d'attente ({rows.length})</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>Rien en attente.</Text>
      ) : (
        rows.map(r => (
          <View key={r.localId} style={styles.row}>
            <Text style={styles.rowTitle}>{r.actionType} · item {r.entityId.slice(-6)}</Text>
            <Text style={styles.rowMeta}>créé {r.createdAt} · v{r.baseVersion ?? '?'}</Text>
          </View>
        ))
      )}

      <Text style={styles.section}>Conflits ({conflicts.length})</Text>
      {conflicts.length === 0 ? (
        <Text style={styles.empty}>Aucun conflit.</Text>
      ) : (
        conflicts.map(cf => (
          <View key={cf.localId} style={[styles.row, styles.conflict]}>
            <View style={styles.rowTitleLine}>
              <AlertTriangle color={c.warning} size={15} strokeWidth={2.5} />
              <Text style={styles.rowTitle}>{cf.actionType} · item {cf.entityId.slice(-6)}</Text>
            </View>
            <Text style={styles.rowMeta}>{cf.lastError ?? 'conflit de version'} · {cf.attempts} tentative(s)</Text>
            <View style={styles.conflictActions}>
              <Pressable
                onPress={() => {
                  outboxRepo.mark(cf.localId, 'pending');
                  refresh();
                }}>
                <Text style={styles.replay}>Rejouer</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  outboxRepo.remove(cf.localId);
                  refresh();
                }}>
                <Text style={styles.discard}>Abandonner</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  container: {flex: 1, backgroundColor: c.bg},
  summary: {backgroundColor: c.surface, borderRadius: 10, padding: 14},
  summaryText: {color: c.text, fontWeight: '600'},
  lastResult: {color: c.textMuted, marginTop: 6, fontSize: 12},
  button: {backgroundColor: c.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 14},
  buttonDisabled: {opacity: 0.5},
  buttonText: {color: '#0f172a', fontWeight: '700'},
  section: {color: c.textMuted, marginTop: 22, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  empty: {color: c.textMuted},
  row: {backgroundColor: c.surface, borderRadius: 8, padding: 12, marginBottom: 8},
  rowTitle: {color: c.text, fontWeight: '600'},
  rowTitleLine: {flexDirection: 'row', alignItems: 'center', gap: 6},
  rowMeta: {color: c.textMuted, fontSize: 12, marginTop: 2},
  conflict: {borderWidth: 1, borderColor: c.danger},
  conflictActions: {flexDirection: 'row', gap: 20, marginTop: 8},
  replay: {color: c.primary, fontWeight: '600'},
  discard: {color: c.danger, fontWeight: '600'},
});
