import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {DownloadCloud} from 'lucide-react-native';
import {useFocusEffect, useScrollToTop} from '@react-navigation/native';

import {AlertTriangle} from 'lucide-react-native';

import {ConnectivityBadge} from '@/components/ConnectivityBadge';
import {outboxService} from '@/services/sync/outboxService.instance';
import {changeBus} from '@/services/store/changeBus';
import {explainSyncError} from '@/domain/syncError';
import {resyncSector} from '@/services/sync/initialSync';
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
  const [resyncing, setResyncing] = useState(false);

  const refresh = useCallback(() => {
    setRows(outboxRepo.listPending());
    setConflicts(outboxRepo.listConflicts());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // La file se vide sous les yeux de l'utilisateur, y compris quand la synchro
  // part toute seule au retour du réseau.
  useEffect(() => changeBus.subscribe('outbox', refresh), [refresh]);

  const onForce = async () => {
    await forceSync();
    refresh();
  };

  const onResync = async () => {
    setResyncing(true);
    try {
      const res = await resyncSector();
      Alert.alert('Secteur retéléchargé', `${res.itemCount} équipement(s) en cache.`);
    } catch (e) {
      Alert.alert('Échec', e instanceof Error ? e.message : 'Retéléchargement impossible.');
    } finally {
      setResyncing(false);
      refresh();
    }
  };

  /*
   * Un appui sur l'onglet déjà actif ramène la liste en haut : comportement
   * standard iOS/Android, fourni par React Navigation. Le hook n'agit que si
   * l'écran est déjà au premier plan — il n'interfère pas avec la navigation.
   */
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  return (
    <View style={styles.screen}>
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.summary}>
        <ConnectivityBadge online={online}>
          {` · ${pending} en attente · ${conflicts.length} conflit(s)`}
        </ConnectivityBadge>
        {lastResult ? (
          <Text style={styles.lastResult}>
            Dernière synchro : {lastResult.synced} OK, {lastResult.conflicts} conflits, {lastResult.failed} échecs
            {lastResult.rolledBack > 0 ? `, ${lastResult.rolledBack} annulée(s)` : ''}
          </Text>
        ) : null}
      </View>

      <Text style={styles.section}>File d'attente ({rows.length})</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>Rien en attente.</Text>
      ) : (
        rows.map(r => (
          <View key={r.localId} style={[styles.row, r.status === 'failed' && styles.rowFailed]}>
            <Text style={styles.rowTitle}>{r.actionType} · item {r.entityId.slice(-6)}</Text>
            <Text style={styles.rowMeta}>créé {r.createdAt} · v{r.baseVersion ?? '?'}</Text>
            {r.status === 'failed' ? (
              <>
                <Text style={styles.rowError}>
                  {explainSyncError(r.lastError)} ({r.attempts} tentative(s))
                </Text>
                <Pressable
                  onPress={() => {
                    // Sortie de secours pour une action qui ne partira jamais :
                    // on rend son état réel à l'équipement avant de la retirer.
                    outboxService.rollbackRow(r);
                    outboxRepo.remove(r.localId);
                    refresh();
                  }}>
                  <Text style={styles.discard}>Abandonner cette action</Text>
                </Pressable>
              </>
            ) : null}
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
                  // Rollback visuel : l'équipement retrouve son état réel
                  // avant qu'on retire l'action de la file.
                  outboxService.rollbackRow(cf);
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

    {/*
      * Barre d'actions ancrée en bas : c'est là que le pouce se trouve, et la
      * file d'attente — le contenu qu'on vient consulter — reprend le haut de
      * l'écran au lieu d'être repoussée sous deux boutons.
      */}
    <View style={styles.actions}>
      <Pressable style={[styles.button, (!online || syncing) && styles.buttonDisabled]} onPress={onForce} disabled={!online || syncing}>
        <Text style={styles.buttonText}>{syncing ? 'Synchronisation…' : 'Forcer la synchro'}</Text>
      </Pressable>

      <Pressable style={styles.secondary} onPress={onResync} disabled={resyncing || !online}>
        {resyncing ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <>
            <DownloadCloud color={c.primary} size={16} strokeWidth={2.5} />
            <Text style={styles.secondaryText}>Retélécharger le secteur</Text>
          </>
        )}
      </Pressable>
      <Text style={styles.secondaryHint}>
        Purge le cache local et retélécharge l'événement assigné. À utiliser après une
        réaffectation de secteur.
      </Text>
    </View>
    </View>
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
  secondary: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  secondaryText: {color: c.primary, fontWeight: '700'},
  secondaryHint: {color: c.textMuted, fontSize: 11, marginTop: 6, lineHeight: 15},
  section: {color: c.textMuted, marginTop: 22, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
  screen: {flex: 1, backgroundColor: c.bg},
  content: {padding: 16, paddingBottom: 24},
  actions: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.bg,
  },
  rowFailed: {borderWidth: 1, borderColor: c.warning},
  rowError: {color: c.warning, fontSize: 12, marginTop: 6, lineHeight: 16},
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
