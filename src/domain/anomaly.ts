import type {ItemStatus} from '@/types/api';

/** Trois signalements terrain distincts, portés par le même écran de saisie. */
export type ReportKind = 'anomaly' | 'lost' | 'maintenance';

/** Limite reprise de `anomalySchema` côté API (`z.string().min(1).max(500)`). */
export const ANOMALY_NOTE_MAX = 500;

export const REPORT_LABELS: Record<ReportKind, string> = {
  anomaly: 'Signaler une anomalie',
  lost: 'Déclarer perdu',
  maintenance: 'Mettre en maintenance',
};

/** Confirmation affichée une fois l'action empilée dans la file sortante. */
export const REPORT_DONE: Record<ReportKind, string> = {
  anomaly: 'Anomalie enregistrée. Elle partira à la prochaine synchro.',
  lost: 'Perte enregistrée. Elle partira à la prochaine synchro.',
  maintenance: 'Mise en maintenance enregistrée. Elle partira à la prochaine synchro.',
};

/** Ce que le signalement va faire, annoncé avant validation. */
export const REPORT_HINTS: Record<ReportKind, string> = {
  anomaly:
    'Le statut de l’équipement ne change pas : le signalement est ajouté à son historique.',
  lost: 'L’équipement passera en « Perdu ». Cet état est définitif.',
  maintenance:
    'L’équipement passera en « Maintenance ». Il reste rattaché à l’événement jusqu’à son retour au stock.',
};

/**
 * Statut visé par un signalement, quand il en change un.
 *
 * L'anomalie n'y figure pas : elle enrichit l'historique sans toucher au
 * statut (même règle que `ItemEntity.reportAnomaly` côté API). Les entrées de
 * cette table sont exactement celles qui déclenchent l'Optimistic UI — et donc
 * les seules à avoir un rollback à jouer en cas d'échec définitif.
 */
export const REPORT_TARGET: Partial<Record<ReportKind, ItemStatus>> = {
  lost: 'lost',
  maintenance: 'in_maintenance',
};

/**
 * Valide la note d'un signalement. Renvoie `null` si tout va bien, sinon le
 * message à afficher.
 *
 * L'anomalie exige une note : l'API rejette une note vide avec
 * `item.anomaly_note_required`. La perte et la mise en maintenance
 * l'acceptent facultative.
 */
export function validateAnomalyNote(note: string, kind: ReportKind): string | null {
  const trimmed = note.trim();

  if (kind === 'anomaly' && trimmed.length === 0) {
    return 'Décrivez l’anomalie : cette note est obligatoire.';
  }
  if (trimmed.length > ANOMALY_NOTE_MAX) {
    return `La note ne peut pas dépasser ${ANOMALY_NOTE_MAX} caractères.`;
  }
  return null;
}
