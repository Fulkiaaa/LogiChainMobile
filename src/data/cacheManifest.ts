export const CACHE_MANIFEST = {
  item: { persist: true, clearOnSync: false,
    fields: ['id','qrCode','label','category','status','eventId','lng','lat','weightKg','version','updatedAt'] as const,
    drop: ['history','purchasePriceEur','manufacturingCo2Kg'] as const },
  event: { persist: true, clearOnSync: false,
    fields: ['id','name','status','startsAt','endsAt','version'] as const },
  zone: { persist: true, clearOnSync: false,
    fields: ['id','eventId','name','geojson'] as const },
  outbox: { persist: true, clearOnSync: true },
} as const;

export function pickCachedFields(entity: 'item'|'event'|'zone', obj: Record<string, unknown>) {
  const fields = CACHE_MANIFEST[entity].fields as readonly string[];
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f in obj) out[f] = obj[f];
  return out;
}
