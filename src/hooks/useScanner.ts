import {useCallback, useMemo, useState} from 'react';

import {ENV} from '@/config/env';
import type {ScanMode} from '@/domain/scanAction';
import {itemsRepo} from '@/services/db/database';
import {feedbackReject, feedbackSuccess} from '@/services/scan/feedback';
import {createScanDeduper} from '@/services/scan/ScanService';
import {getCurrentPosition} from '@/services/geo/location';
import {outboxService} from '@/services/sync/outboxService.instance';
import {makeId} from '@/services/util/id';

export interface ScanResult {
  label: string;
  ok: boolean;
}

export interface ScannerState {
  onCode: (code: string) => void;
  sessionCount: number;
  lastResults: ScanResult[];
}

/**
 * Orchestration d'un scan : dédup → résolution locale (SQLite indexé) →
 * feedback immédiat → géoloc → enqueue outbox. Aucun appel réseau ici.
 */
export function useScanner(mode: ScanMode): ScannerState {
  const deduper = useMemo(() => createScanDeduper(ENV.SCAN_DEDUP_MS), []);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastResults, setLastResults] = useState<ScanResult[]>([]);

  const push = useCallback((r: ScanResult) => {
    setLastResults(prev => [r, ...prev].slice(0, 20));
  }, []);

  const onCode = useCallback(
    async (code: string) => {
      if (deduper.isDuplicate(code, Date.now())) {
        return;
      }
      const item = itemsRepo.findByQrCode(code);
      if (!item) {
        feedbackReject();
        push({label: code, ok: false});
        return;
      }
      let location;
      try {
        location = await getCurrentPosition();
      } catch {
        feedbackReject();
        push({label: `${item.label} (pas de GPS)`, ok: false});
        return;
      }
      const res = outboxService.enqueueScan({
        localId: makeId('ob'),
        itemId: item.id,
        mode,
        location,
        now: new Date().toISOString(),
      });
      if (res.ok) {
        feedbackSuccess();
        setSessionCount(c => c + 1);
        push({label: item.label, ok: true});
      } else {
        feedbackReject();
        push({label: `${item.label} — ${res.reason}`, ok: false});
      }
    },
    [deduper, mode, push],
  );

  return {onCode, sessionCount, lastResults};
}
