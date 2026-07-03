import type {ItemStatus} from '@/types/api';

export const COLORS = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  primary: '#38bdf8',
  success: '#4ade80',
  danger: '#f87171',
  warning: '#fbbf24',
  border: '#334155',
};

export const STATUS_LABELS: Record<ItemStatus, string> = {
  in_stock: 'En stock',
  allocated: 'Alloué',
  in_transit: 'En transit',
  deployed: 'Déployé',
  in_maintenance: 'Maintenance',
  lost: 'Perdu',
};

export const STATUS_COLORS: Record<ItemStatus, string> = {
  in_stock: '#94a3b8',
  allocated: '#38bdf8',
  in_transit: '#fbbf24',
  deployed: '#4ade80',
  in_maintenance: '#a78bfa',
  lost: '#f87171',
};
