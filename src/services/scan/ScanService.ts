/**
 * Anti-doublon de scan.
 *
 * La fenêtre court depuis la **dernière vue** du code, pas depuis le dernier
 * scan accepté : tant que le QR reste dans le champ de la caméra, chaque image
 * repousse l'échéance et le code n'est jamais réenfilé. Il faut que le code
 * quitte le champ pendant `windowMs` pour être accepté à nouveau.
 *
 * Sans ce rafraîchissement, viser un QR en continu le réenfilait toutes les
 * `windowMs` — la caméra produisant des dizaines d'images par seconde.
 */
export function createScanDeduper(windowMs: number) {
  const lastSeen = new Map<string, number>();
  return {
    isDuplicate(code: string, now: number): boolean {
      const prev = lastSeen.get(code);
      // Repoussé à chaque vue, doublon ou non.
      lastSeen.set(code, now);
      return prev !== undefined && now - prev < windowMs;
    },
  };
}
