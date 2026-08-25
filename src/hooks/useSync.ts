import {useCallback, useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';

import {ENV} from '@/config/env';
import {shouldAutoSync} from '@/domain/autoSync';
import {outboxRepo} from '@/services/db/database';
import {runFlush} from '@/services/sync/syncEngine.instance';
import {changeBus} from '@/services/store/changeBus';

import {useConnectivity} from './useConnectivity';

export interface SyncState {
  pending: number;
  syncing: boolean;
  lastResult: {synced: number; conflicts: number; failed: number; rolledBack: number} | null;
  forceSync: () => Promise<void>;
  refreshPending: () => void;
}

export function useSync(): SyncState {
  const {online} = useConnectivity();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  // Doublé en ref : le déclencheur automatique vit dans un abonnement au bus,
  // qui capturerait une valeur d'état périmée.
  const syncingRef = useRef(false);
  const [lastResult, setLastResult] = useState<SyncState['lastResult']>(null);
  const queryClient = useQueryClient();

  const refreshPending = useCallback(() => {
    setPending(outboxRepo.countPending());
  }, []);

  const forceSync = useCallback(async () => {
    setSyncing(true);
    syncingRef.current = true;
    try {
      // Verrou global : si un autre écran synchronise déjà, on n'envoie pas
      // les mêmes actions une seconde fois (runFlush renvoie null).
      const result = await runFlush();
      if (result) {
        setLastResult(result);
        queryClient.invalidateQueries();
      }
    } finally {
      setSyncing(false);
      syncingRef.current = false;
      refreshPending();
    }
  }, [queryClient, refreshPending]);

  /*
   * Le compteur suit les écritures locales, d'où qu'elles viennent — ET une
   * action empilée alors qu'on est déjà en ligne déclenche sa propre synchro.
   *
   * Sans ce second rôle, le seul déclencheur était le retour du réseau : un
   * agent connecté en permanence voyait sa file grossir sans que rien ne
   * parte, et devait forcer la synchro à la main.
   *
   * Le délai absorbe les rafales : quarante scans d'affilée n'envoient pas
   * quarante synchros, ils en envoient une quand la main s'arrête.
   */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = changeBus.subscribe('outbox', () => {
      refreshPending();
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        const decision = {
          online,
          freshCount: outboxRepo.countFresh(),
          syncing: syncingRef.current,
        };
        if (shouldAutoSync(decision)) {
          void forceSync();
        }
      }, ENV.AUTO_SYNC_DELAY_MS);
    });
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      unsubscribe();
    };
  }, [online, forceSync, refreshPending]);

  // Sync auto au retour du réseau : reprend aussi les actions en échec, que le
  // déclencheur ci-dessus laisse volontairement de côté.
  useEffect(() => {
    refreshPending();
    if (online && outboxRepo.countPending() > 0) {
      void forceSync();
    }
  }, [online, forceSync, refreshPending]);

  return {pending, syncing, lastResult, forceSync, refreshPending};
}
