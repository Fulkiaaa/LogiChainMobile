import type {EventJSON, Paginated} from '@/types/api';

import {api} from './index';

export const eventsApi = {
  async list(): Promise<EventJSON[]> {
    const {data} = await api.apiFetch<Paginated<EventJSON>>('/events?limit=100', {auth: true});
    return data.data;
  },
  async getById(id: string): Promise<EventJSON> {
    const {data} = await api.apiFetch<EventJSON>(`/events/${id}`, {auth: true});
    return data;
  },
};
