/** Deux signalements terrain distincts, portés par le même écran de saisie. */
export type ReportKind = 'anomaly' | 'lost';

/** Limite reprise de `anomalySchema` côté API (`z.string().min(1).max(500)`). */
export const ANOMALY_NOTE_MAX = 500;

export const REPORT_LABELS: Record<ReportKind, string> = {
  anomaly: 'Signaler une anomalie',
  lost: 'Déclarer perdu',
};

/**
 * Valide la note d'un signalement. Renvoie `null` si tout va bien, sinon le
 * message à afficher.
 *
 * L'anomalie exige une note : l'API rejette une note vide avec
 * `item.anomaly_note_required`. La perte, elle, l'accepte facultative.
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
