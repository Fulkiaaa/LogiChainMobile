export type ItemStatus = 'in_stock' | 'allocated' | 'in_transit'
                       | 'deployed' | 'in_maintenance' | 'lost';
export const ITEM_STATUSES: ItemStatus[] =
  ['in_stock','allocated','in_transit','deployed','in_maintenance','lost'];
export type ItemCategory = 'staging'|'sound'|'lighting'|'video'|'power'
                         |'tent'|'furniture'|'sanitary'|'fencing'|'other';
export type UserRole = 'admin'|'logistics_manager'|'field_agent'|'transporter';

export interface GeoPoint { type: 'Point'; coordinates: [number, number]; }

export interface ItemMovement {
  at: string; type: 'scan'|'allocation'|'transit'|'deploy'|'maintenance'|'anomaly'|'return';
  fromStatus?: ItemStatus; toStatus: ItemStatus; location?: GeoPoint; operatorId: string; note?: string;
}
export interface ItemJSON {
  id: string; version: number; createdAt: string; updatedAt: string;
  qrCode: string; label: string; category: ItemCategory; status: ItemStatus;
  eventId: string | null; location: GeoPoint | null; weightKg: number;
  purchasePriceEur: number | null; lifespanYears: number;
  manufacturingCo2Kg: number; history: ItemMovement[];
}
export type EventStatus = 'planning' | 'active' | 'closed' | 'cancelled';
export type ZoneCategory =
  'stage' | 'backstage' | 'public' | 'logistics' | 'parking' | 'restricted' | 'other';

export interface PolygonGeometry { type: 'Polygon'; coordinates: number[][][]; }

/** Zone embarquée dans l'événement (pas d'endpoint séparé côté API). */
export interface EventZone {
  id?: string;
  name: string;
  category: ZoneCategory;
  capacity?: number;
  area: PolygonGeometry;
}

export interface EventJSON {
  id: string; version: number; createdAt: string; updatedAt: string;
  name: string; slug: string; status: EventStatus;
  startDate: string; endDate: string;
  expectedAttendance: number | null;
  zones: EventZone[]; managerId: string;
}

export interface UserJSON { id: string; email: string; fullName: string; role: UserRole; }
/** Réponse de GET /auth/me : identité minimale issue du JWT. */
export interface MeUser { id: string; email: string; role: UserRole; }
export interface LoginResult { token: string; refreshToken: string; user: UserJSON; }

/** Enveloppe de pagination exacte de l'API LogiChain. */
export interface Paginated<T> {
  data: T[]; count: number; page: number; limit: number; totalPages: number;
}

/** Rapport d'empreinte carbone d'un événement (GET /dashboard/events/:id/carbon-footprint). */
export interface EventCarbonReport {
  eventId: string; eventName: string; eventDurationDays: number;
  totalCo2Kg: number; manufacturingCo2Kg: number; transportCo2Kg: number;
  byCategory: Record<string, number>; byTransportMode: Record<string, number>;
  itemCount: number; routeCount: number;
}
