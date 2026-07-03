import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import EventSource from 'react-native-sse';
import {useQueryClient} from '@tanstack/react-query';

import {ENV} from '@/config/env';
import {tokenStore} from '@/services/api/tokenStore';

export interface Alert {
  id: string;
  type: string;
  message: string;
  at: string;
}

/**
 * Écoute le flux SSE d'alertes critiques quand l'app est au premier plan
 * (fermé en arrière-plan pour économiser la batterie). Invalide le cache items
 * à chaque alerte reçue.
 */
export function useNotificationsSSE(): {alerts: Alert[]} {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;

    const openStream = async () => {
      const tokens = await tokenStore.get();
      if (!tokens || cancelled) {
        return;
      }
      es = new EventSource(
        `${ENV.API_BASE_URL}/notifications/stream?token=${encodeURIComponent(tokens.token)}`,
      );
      es.addEventListener('message', event => {
        try {
          const data = JSON.parse((event as {data: string}).data ?? '{}');
          const alert: Alert = {
            id: data.id ?? String(Date.now()),
            type: data.type ?? 'info',
            message: data.message ?? data.type ?? 'Alerte',
            at: data.at ?? new Date().toISOString(),
          };
          setAlerts(prev => [alert, ...prev].slice(0, 50));
          queryClient.invalidateQueries();
        } catch {
          // message non-JSON (heartbeat) : ignoré
        }
      });
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
