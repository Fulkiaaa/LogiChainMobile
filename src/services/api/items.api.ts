import type {GeoPoint, ItemJSON, Paginated} from '@/types/api';

import {api} from './index';

/** Résultat d'un POST d'action item : statut HTTP + item à jour. */
export type ItemActionResult = {status: number; data: ItemJSON};

export const itemsApi = {
  async listByEvent(eventId: string): Promise<ItemJSON[]> {
    const {data} = await api.apiFetch<Paginated<ItemJSON>>(
      `/items?eventId=${encodeURIComponent(eventId)}&limit=100`,
      {auth: true},
    );
    return data.data;
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
};
