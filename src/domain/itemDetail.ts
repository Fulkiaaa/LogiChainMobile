import {formatCoords, toMovementLines, type MovementLine} from '@/domain/itemHistory';
import type {CachedItem} from '@/services/db/items.repo';
import type {ItemCategory, ItemJSON, ItemStatus} from '@/types/api';

/** Tout ce que la fiche affiche, déjà résolu — l'écran ne fait plus d'arbitrage. */
export interface ItemDetailView {
  label: string;
  status: ItemStatus | null;
  qrCode: string | null;
  category: ItemCategory | null;
  weightKg: number | null;
  purchasePriceEur: number | null;
  lifespanYears: number | null;
  manufacturingCo2Kg: number | null;
  /** Forme « lat, lng », ou `null` si l'équipement n'est pas localisé. */
  coords: string | null;
  version: number | null;
  movements: MovementLine[];
  /** Vrai quand seul le miroir local a répondu : certains champs manqueront. */
  offlineOnly: boolean;
  /** Vrai quand le statut affiché vient d'un geste que le serveur ignore encore. */
  pendingSync: boolean;
}

/**
 * Fusionne la réponse serveur et le cache local, le serveur l'emportant.
 *
 * Le cache ne stocke que le strict nécessaire à la liste : prix, durée de vie,
 * CO2 et historique n'y sont pas. On les laisse à `null` plutôt que de les
 * remplir avec zéro — un zéro se lirait comme une vraie mesure.
 *
 * SEULE EXCEPTION, le statut quand une action attend encore d'être envoyée
 * (`pendingLocal`). Le serveur est alors en retard d'un geste, pas en avance :
 * afficher sa version reviendrait à effacer à l'écran l'action que
 * l'application vient d'accepter, ce qui est exactement le contraire de
 * l'Optimistic UI. Le drapeau `pendingSync` permet à la fiche de dire d'où
 * vient ce qu'elle affiche.
 */
export function toItemDetail(
  id: string,
  remote: ItemJSON | undefined,
  // `itemsRepo.findById` renvoie `null`, `useQuery` renvoie `undefined` :
  // on accepte les deux plutôt que de forcer l'appelant à convertir.
  cached: CachedItem | null | undefined,
  pendingLocal = false,
): ItemDetailView {
  const lat = remote?.location?.coordinates[1] ?? cached?.lat ?? null;
  const lng = remote?.location?.coordinates[0] ?? cached?.lng ?? null;

  return {
    label: remote?.label ?? cached?.label ?? id,
    status: (pendingLocal ? cached?.status : undefined) ?? remote?.status ?? cached?.status ?? null,
    qrCode: remote?.qrCode ?? cached?.qrCode ?? null,
    category: remote?.category ?? cached?.category ?? null,
    weightKg: remote?.weightKg ?? cached?.weightKg ?? null,
    purchasePriceEur: remote?.purchasePriceEur ?? null,
    lifespanYears: remote?.lifespanYears ?? null,
    manufacturingCo2Kg: remote?.manufacturingCo2Kg ?? null,
    coords: formatCoords(lat, lng),
    version: remote?.version ?? cached?.version ?? null,
    movements: remote ? toMovementLines(remote.history) : [],
    offlineOnly: remote === undefined,
    pendingSync: pendingLocal && remote !== undefined && cached != null,
  };
}
