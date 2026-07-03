import type {EventCarbonReport} from '@/types/api';

import {api} from './index';

export const dashboardApi = {
  /** Empreinte carbone consolidée d'un événement (accessible à tout utilisateur authentifié). */
  async carbonFootprint(eventId: string): Promise<EventCarbonReport> {
    const {data} = await api.apiFetch<EventCarbonReport>(
      `/dashboard/events/${eventId}/carbon-footprint`,
      {auth: true},
    );
    return data;
  },
};
