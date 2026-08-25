import type {GeoPoint, ItemJSON, Paginated} from '@/types/api';

import {api} from './index';
import {API_PAGE_SIZE, fetchAllPages} from './paginate';

/** Résultat d'un POST d'action item : statut HTTP + item à jour. */
export type ItemActionResult = {status: number; data: ItemJSON};

export const itemsApi = {
  /**
   * Secteur assigné, en entier. L'API plafonne `limit` à 100 : au-delà, un
   * appel unique tronquait silencieusement le parc et l'agent croyait avoir
   * tout son matériel. On parcourt donc toutes les pages.
   */
  async listByEvent(eventId: string): Promise<ItemJSON[]> {
    const ev = encodeURIComponent(eventId);
    return fetchAllPages<ItemJSON>(
      async page => {
        const {status, data} = await api.apiFetch<Paginated<ItemJSON>>(
          `/items?eventId=${ev}&limit=${API_PAGE_SIZE}&page=${page}`,
          {auth: true},
        );
        // Sans ce garde-fou, un 500 en milieu de parcours serait parsé en `{}`
        // et refermerait la boucle : secteur partiel mis en cache sans un mot.
        if (status < 200 || status >= 300) {
          throw new Error(
            `Téléchargement du secteur interrompu (HTTP ${status}, page ${page}).`,
          );
        }
        return data;
      },
      {keyOf: item => item.id},
    );
  },
  async getById(id: string): Promise<ItemJSON> {
    const {data} = await api.apiFetch<ItemJSON>(`/items/${id}`, {auth: true});
    return data;
  },
  scan(id: string, body: {location: GeoPoint; note?: string}): Promise<ItemActionResult> {
    return api.apiFetch<ItemJSON>(`/items/${id}/scan`, {method: 'POST', body, auth: true});
  },
  transit(id: string, body: {location?: GeoPoint}): Promise<ItemActionResult> {
    return api.apiFetch<ItemJSON>(`/items/${id}/transit`, {method: 'POST', body, auth: true});
  },
  deploy(id: string, body: {location: GeoPoint}): Promise<ItemActionResult> {
    return api.apiFetch<ItemJSON>(`/items/${id}/deploy`, {method: 'POST', body, auth: true});
  },
  anomaly(id: string, body: {location: GeoPoint; note: string}): Promise<ItemActionResult> {
    return api.apiFetch<ItemJSON>(`/items/${id}/anomaly`, {method: 'POST', body, auth: true});
  },
  lost(id: string, body: {note?: string}): Promise<ItemActionResult> {
    return api.apiFetch<ItemJSON>(`/items/${id}/lost`, {method: 'POST', body, auth: true});
  },
};
