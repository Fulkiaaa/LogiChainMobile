import {useCallback, useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';

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
  const [lastResult, setLastResult] = useState<SyncState['lastResult']>(null);
  const queryClient = useQueryClient();

  const refreshPending = useCallback(() => {
    setPending(outboxRepo.countPending());
  }, []);

  const forceSync = useCallback(async () => {
    setSyncing(true);
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
      refreshPending();
    }
  }, [queryClient, refreshPending]);

  // Le compteur suit les écritures locales, d'où qu'elles viennent.
  useEffect(() => changeBus.subscribe('outbox', refreshPending), [refreshPending]);

  // Sync auto au retour du réseau si des actions sont en attente.
  useEffect(() => {
    refreshPending();
    if (online && outboxRepo.countPending() > 0) {
      void forceSync();
    }
  }, [online, forceSync, refreshPending]);

  return {pending, syncing, lastResult, forceSync, refreshPending};
}
