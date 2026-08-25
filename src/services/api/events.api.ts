import type {EventJSON, Paginated} from '@/types/api';

import {api} from './index';
import {API_PAGE_SIZE, fetchAllPages} from './paginate';

export const eventsApi = {
  /**
   * Même plafond de 100 que sur `/items` : l'onboarding cherche l'événement
   * `active` dans cette liste, un parc d'événements plus fourni le rendrait
   * introuvable et l'agent repartirait avec un secteur vide.
   */
  async list(): Promise<EventJSON[]> {
    return fetchAllPages<EventJSON>(
      async page => {
        const {status, data} = await api.apiFetch<Paginated<EventJSON>>(
          `/events?limit=${API_PAGE_SIZE}&page=${page}`,
          {auth: true},
        );
        if (status < 200 || status >= 300) {
          throw new Error(
            `Liste des événements indisponible (HTTP ${status}, page ${page}).`,
          );
        }
        return data;
      },
      {keyOf: ev => ev.id},
    );
  },
  async getById(id: string): Promise<EventJSON> {
    const {data} = await api.apiFetch<EventJSON>(`/events/${id}`, {auth: true});
    return data;
  },
};
