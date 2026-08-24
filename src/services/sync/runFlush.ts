import type {FlushResult} from './SyncEngine';

/**
 * Sérialise les flushes.
 *
 * `useSync` est monté dans plusieurs écrans, et React Navigation garde les
 * onglets vivants : au retour du réseau, chaque instance déclenchait sa propre
 * synchro. Un garde-fou porté par un `useRef` est local à l'instance, donc
 * inopérant — deux flushes lisaient la même file et pouvaient envoyer deux
 * fois la même action (l'API n'est pas idempotente sur les scans).
 *
 * Le verrou vit ici, au niveau du module, donc une seule fois pour toute
 * l'application. Un appel concurrent renvoie `null` au lieu de dupliquer.
 */
export function createGuardedFlush(run: () => Promise<FlushResult>) {
  let busy = false;

  return async function guardedFlush(): Promise<FlushResult | null> {
    if (busy) {
      return null;
    }
    busy = true;
    try {
      return await run();
    } finally {
      // Relâché même en cas d'échec, sinon une erreur réseau bloquerait
      // définitivement toute synchro ultérieure.
      busy = false;
    }
  };
}
