/**
 * Bus de notification des écritures locales.
 *
 * Les repos SQLite sont synchrones et sans état React : un écran qui a lu la
 * base ne peut pas savoir qu'un autre écran vient d'y écrire. Le bus comble ce
 * trou — les repos émettent après chaque écriture, les hooks s'abonnent.
 *
 * Volontairement minimal : pas de payload, juste « ce sujet a changé, relis ».
 * Les lectures SQLite sont locales et rapides, une relecture complète coûte
 * moins cher qu'un cache à invalider finement.
 */
export type ChangeTopic = 'items' | 'outbox';

export type Unsubscribe = () => void;

export function createChangeBus() {
  const listeners: Record<ChangeTopic, Set<() => void>> = {
    items: new Set(),
    outbox: new Set(),
  };

  return {
    subscribe(topic: ChangeTopic, fn: () => void): Unsubscribe {
      listeners[topic].add(fn);
      return () => {
        listeners[topic].delete(fn);
      };
    },

    emit(topic: ChangeTopic): void {
      // Copie défensive : un abonné peut se désabonner pendant la diffusion.
      for (const fn of [...listeners[topic]]) {
        try {
          fn();
        } catch {
          // Un abonné défaillant ne doit pas priver les autres de la notification.
        }
      }
    },
  };
}

export type ChangeBus = ReturnType<typeof createChangeBus>;

/** Bus applicatif unique. */
export const changeBus = createChangeBus();
