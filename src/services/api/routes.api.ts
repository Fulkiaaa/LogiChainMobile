import type {Paginated, RouteJSON} from '@/types/api';

import {api} from './index';
import {API_PAGE_SIZE, fetchAllPages} from './paginate';

export const routesApi = {
  /**
   * Tournées d'un événement. `GET /routes` n'est protégé par aucun
   * `requireRole` côté API : consulter une feuille de route est ouvert à tout
   * compte authentifié, seule son écriture est restreinte.
   */
  async listByEvent(eventId: string): Promise<RouteJSON[]> {
    return fetchAllPages<RouteJSON>(
      async page => {
        const {status, data} = await api.apiFetch<Paginated<RouteJSON>>(
          `/routes?eventId=${eventId}&limit=${API_PAGE_SIZE}&page=${page}`,
          {auth: true},
        );
        if (status < 200 || status >= 300) {
          throw new Error(`Tournées indisponibles (HTTP ${status}, page ${page}).`);
        }
        return data;
      },
      {keyOf: r => r.id},
    );
  },
};
