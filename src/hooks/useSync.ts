import {useCallback, useEffect, useRef, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';

import {outboxRepo} from '@/services/db/database';
import {syncEngine} from '@/services/sync/syncEngine.instance';

import {useConnectivity} from './useConnectivity';

export interface SyncState {
  pending: number;
  syncing: boolean;
  lastResult: {synced: number; conflicts: number; failed: number} | null;
  forceSync: () => Promise<void>;
  refreshPending: () => void;
}

export function useSync(): SyncState {
  const {online} = useConnectivity();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncState['lastResult']>(null);
  const busy = useRef(false);
  const queryClient = useQueryClient();

  const refreshPending = useCallback(() => {
    setPending(outboxRepo.countPending());
  }, []);

  const forceSync = useCallback(async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setSyncing(true);
    try {
      const result = await syncEngine.flush();
      setLastResult(result);
      queryClient.invalidateQueries();
    } finally {
      busy.current = false;
      setSyncing(false);
      refreshPending();
    }
  }, [queryClient, refreshPending]);

  // Sync auto au retour du réseau si des actions sont en attente.
  useEffect(() => {
    refreshPending();
    if (online && outboxRepo.countPending() > 0) {
      void forceSync();
    }
  }, [online, forceSync, refreshPending]);

  return {pending, syncing, lastResult, forceSync, refreshPending};
}
