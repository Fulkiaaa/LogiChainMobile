export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Horodatage serveur (`createdAt` dans la charge utile SSE). */
  at: string;
}

const SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];

/**
 * Convertit une charge utile SSE en alerte affichable.
 *
 * Renvoie `null` pour tout ce qui n'est pas une alerte : heartbeats `: ping`,
 * poignée de main `{"ok":true}`, JSON invalide. Le flux mélange ces trois
 * natures de messages, l'appelant ne doit pas avoir à les distinguer.
 *
 * Les noms de champs sont ceux réellement émis par l'API (relevés sur le flux
 * de production), pas ceux qu'on pourrait supposer.
 */
export function toAlert(raw: unknown): Alert | null {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') {
    return null;
  }

  const id = typeof data.id === 'string' ? data.id : null;
  if (!id) {
    return null; // poignée de main {"ok":true} ou objet inconnu
  }

  const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
  const title = str(data.title);
  const message = str(data.message);

  return {
    id,
    type: str(data.type) ?? 'info',
    severity: SEVERITIES.includes(data.severity as AlertSeverity)
      ? (data.severity as AlertSeverity)
      : 'info',
    title: title ?? message ?? 'Alerte',
    message: message ?? title ?? 'Alerte',
    at: str(data.createdAt) ?? new Date().toISOString(),
  };
}
