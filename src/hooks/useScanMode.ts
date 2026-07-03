import {useState} from 'react';

import type {ScanMode} from '@/domain/scanAction';

export interface ScanModeState {
  mode: ScanMode;
  setMode: (m: ScanMode) => void;
}

/** Mode de scan courant (Réception/Déploiement, Chargement/Transit, Pointage). */
export function useScanMode(initial: ScanMode = 'pointage'): ScanModeState {
  const [mode, setMode] = useState<ScanMode>(initial);
  return {mode, setMode};
}
