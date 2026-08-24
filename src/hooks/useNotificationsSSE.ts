import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import EventSource from 'react-native-sse';
import {useQueryClient} from '@tanstack/react-query';

import {toAlert, type Alert} from '@/domain/alert';
import {ENV} from '@/config/env';
import {tokenStore} from '@/services/api/tokenStore';

export type {Alert} from '@/domain/alert';

/**
 * Écoute le flux SSE d'alertes critiques quand l'app est au premier plan
 * (fermé en arrière-plan pour économiser la batterie). Invalide le cache items
 * à chaque alerte reçue.
 */
export function useNotificationsSSE(): {alerts: Alert[]} {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Le générique déclare l'événement nommé émis par l'API, sinon le typage
    // de la lib n'autorise que les 4 types standard.
    let es: EventSource<'notification'> | null = null;
    let cancelled = false;

    const openStream = async () => {
      const tokens = await tokenStore.get();
      if (!tokens || cancelled) {
        return;
      }
      es = new EventSource<'notification'>(
        `${ENV.API_BASE_URL}/notifications/stream?token=${encodeURIComponent(tokens.token)}`,
      );

      const onPush = (event: unknown) => {
        const alert = toAlert((event as {data?: string}).data);
        if (!alert) {
          return; // heartbeat, poignée de main, ou charge utile illisible
        }
        setAlerts(prev => [alert, ...prev].slice(0, 50));
        queryClient.invalidateQueries();
      };

      // L'API nomme son événement (`event: notification`). react-native-sse
      // dispatche alors vers ce nom et JAMAIS vers 'message', qui n'est le
      // type par défaut que si le serveur ne nomme pas l'événement.
      // On garde 'message' pour rester compatible si l'API cessait de le nommer.
      es.addEventListener('notification', onPush);
      es.addEventListener('message', onPush);
    };

    const closeStream = () => {
      es?.removeAllEventListeners();
      es?.close();
      es = null;
    };

    void openStream();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (!es) {
          void openStream();
        }
      } else {
        closeStream();
      }
    });

    return () => {
      cancelled = true;
      closeStream();
      sub.remove();
    };
  }, [queryClient]);

  return {alerts};
}
