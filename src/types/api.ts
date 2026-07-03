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
export interface EventJSON {
  id: string; version: number; name: string; status: string;
  startsAt: string; endsAt: string;
}
export interface ZoneJSON { id: string; eventId: string; name: string; geojson: unknown; }
export interface UserJSON { id: string; email: string; fullName: string; role: UserRole; }
export interface LoginResult { token: string; refreshToken: string; user: UserJSON; }
export interface Paginated<T> { data: T[]; page: number; limit: number; total: number; }
