import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {DownloadCloud} from '@/components/icons';
import {useFocusEffect, useScrollToTop} from '@react-navigation/native';

import {AlertTriangle} from '@/components/icons';

import {ConnectivityBadge} from '@/components/ConnectivityBadge';
import {outboxService} from '@/services/sync/outboxService.instance';
import {changeBus} from '@/services/store/changeBus';
import {explainSyncConflict, explainSyncError} from '@/domain/syncError';
import {describeRow, relativeTime} from '@/domain/outboxLabel';
import {resyncSector} from '@/services/sync/initialSync';
import {TOUCH_MIN, type Palette} from '@/config/theme';
import {useTheme} from '@/hooks/useTheme';
import {useConnectivity} from '@/hooks/useConnectivity';
import {useSync} from '@/hooks/useSync';
import {itemsRepo, outboxRepo} from '@/services/db/database';
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

  /**
   * Nomme une ligne de file avec le vocabulaire de l'agent plutôt que celui de
   * la base. Le libellé vient du cache local : disponible hors réseau, absent
   * si l'équipement appartient à un secteur jamais téléchargé.
   */
  const decrire = useCallback(
    (r: OutboxRow) => describeRow(r.actionType, r.entityId, itemsRepo.findById(r.entityId)?.label),
    [],
  );

  /**
   * Abandon d'une action : geste irréversible, donc confirmé.
   *
   * Toute la promesse de l'application est qu'une saisie faite en zone blanche
   * ne se perde pas. Un abandon la supprime définitivement et rend à
   * l'équipement son état d'avant : c'est exactement ce qu'on ne veut pas
   * déclencher par un appui mal ajusté, avec des gants, sous la pluie.
   */
  const confirmerAbandon = useCallback(
    (r: OutboxRow) => {
      Alert.alert(
        'Abandonner cette action ?',
        `${decrire(r)}\n\nElle sera supprimée définitivement et l’équipement retrouvera son état précédent. Cette opération est irréversible.`,
        [
          {text: 'Conserver', style: 'cancel'},
          {
            text: 'Abandonner',
            style: 'destructive',
            onPress: () => {
              // On rend son état réel à l'équipement AVANT de retirer la ligne :
              // l'ordre inverse laisserait un statut optimiste sans rien pour
              // le rejouer.
              outboxService.rollbackRow(r);
              outboxRepo.remove(r.localId);
              refresh();
            },
          },
        ],
      );
    },
    [decrire, refresh],
  );

  const onResync = async () => {
    setResyncing(true);
    try {
      const res = await resyncSector();
      Alert.alert(
        'Secteur retéléchargé',
        `${res.itemCount} équipement(s) et ${res.routeCount} tournée(s) en cache.`,
      );
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
            <Text style={styles.rowTitle}>{decrire(r)}</Text>
            <Text style={styles.rowMeta}>
              {relativeTime(r.createdAt, new Date())} · version {r.baseVersion ?? 'inconnue'}
            </Text>
            {r.status === 'failed' ? (
              <>
                <Text style={styles.rowError}>
                  {explainSyncError(r.lastError)} ({r.attempts} tentative(s))
                </Text>
                {/* Sortie de secours pour une action qui ne partira jamais. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Abandonner : ${decrire(r)}`}
                  accessibilityHint="Supprime définitivement cette action et restaure l’état précédent de l’équipement."
                  style={styles.rowAction}
                  onPress={() => confirmerAbandon(r)}>
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
              <Text style={styles.rowTitle}>{decrire(cf)}</Text>
            </View>
            <Text style={styles.rowMeta}>{explainSyncConflict(cf.lastError)}</Text>
            {/*
              * « Rejouer » est l'issue attendue d'un conflit ; « Abandonner »
              * est la sortie de secours. Les deux étaient côte à côte et à
              * égalité : le second est désormais détaché, et confirmé.
              */}
            <View style={styles.conflictActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Rejouer : ${decrire(cf)}`}
                style={styles.rowAction}
                onPress={() => {
                  outboxRepo.mark(cf.localId, 'pending');
                  refresh();
                }}>
                <Text style={styles.replay}>Rejouer</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Abandonner : ${decrire(cf)}`}
                accessibilityHint="Supprime définitivement cette action et restaure l’état précédent de l’équipement."
                style={styles.rowAction}
                onPress={() => confirmerAbandon(cf)}>
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
      <Pressable
        accessibilityRole="button"
        accessibilityState={{disabled: !online || syncing, busy: syncing}}
        style={[styles.button, (!online || syncing) && styles.buttonDisabled]}
        onPress={onForce}
        disabled={!online || syncing}>
        <Text style={styles.buttonText}>{syncing ? 'Synchronisation…' : 'Forcer la synchro'}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retélécharger le secteur"
        accessibilityState={{disabled: resyncing || !online, busy: resyncing}}
        style={styles.secondary}
        onPress={onResync}
        disabled={resyncing || !online}>
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
  summary: {backgroundColor: c.surface, borderRadius: 10, padding: 16},
  lastResult: {color: c.textMuted, marginTop: 8, fontSize: 12},
  button: {minHeight: TOUCH_MIN, justifyContent: 'center', backgroundColor: c.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16},
  buttonDisabled: {opacity: 0.5},
  buttonText: {color: c.onPrimary, fontWeight: '700'},
  secondary: {
    minHeight: TOUCH_MIN,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
  },
  secondaryText: {color: c.primary, fontWeight: '700'},
  secondaryHint: {color: c.textMuted, fontSize: 12, marginTop: 8, lineHeight: 15},
  section: {color: c.textMuted, marginTop: 24, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', fontSize: 12},
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
  rowError: {color: c.warning, fontSize: 12, marginTop: 8, lineHeight: 16},
  empty: {color: c.textMuted},
  row: {backgroundColor: c.surface, borderRadius: 8, padding: 12, marginBottom: 8},
  rowTitle: {color: c.text, fontWeight: '600', flexShrink: 1},
  rowTitleLine: {flexDirection: 'row', alignItems: 'center', gap: 8},
  rowMeta: {color: c.textMuted, fontSize: 12, marginTop: 4},
  conflict: {borderWidth: 1, borderColor: c.danger},
  // `space-between` plutôt qu'un `gap` de 20 : « Rejouer » et « Abandonner »
  // se touchaient presque, alors qu'ils mènent à des issues opposées.
  conflictActions: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 4},
  /*
   * Ces actions étaient du texte nu, soit environ 17 pt de haut — moins de la
   * moitié du minimum de 44 pt des Human Interface Guidelines, pour une
   * application manipulée debout et parfois avec des gants.
   */
  rowAction: {minHeight: TOUCH_MIN, justifyContent: 'center'},
  replay: {color: c.primary, fontWeight: '600'},
  discard: {color: c.danger, fontWeight: '600'},
});
