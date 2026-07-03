export function createScanDeduper(windowMs: number) {
  const last = new Map<string, number>();
  return {
    isDuplicate(code: string, now: number): boolean {
      const prev = last.get(code);
      if (prev !== undefined && now - prev < windowMs) return true;
      last.set(code, now); return false;
    },
  };
}
