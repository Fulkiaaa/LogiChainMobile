import {ANOMALY_NOTE_MAX, validateAnomalyNote} from '@/domain/anomaly';

describe('validateAnomalyNote — anomalie (note obligatoire)', () => {
  it('accepte une note renseignée', () => {
    expect(validateAnomalyNote('Pied tordu, barrière instable', 'anomaly')).toBeNull();
  });

  it('refuse une note vide — l’API renvoie item.anomaly_note_required', () => {
    expect(validateAnomalyNote('', 'anomaly')).not.toBeNull();
  });

  it('refuse une note faite d’espaces seulement', () => {
    expect(validateAnomalyNote('    ', 'anomaly')).not.toBeNull();
  });

  it(`refuse au-delà de ${ANOMALY_NOTE_MAX} caractères`, () => {
    expect(validateAnomalyNote('x'.repeat(ANOMALY_NOTE_MAX + 1), 'anomaly')).not.toBeNull();
  });

  it(`accepte exactement ${ANOMALY_NOTE_MAX} caractères`, () => {
    expect(validateAnomalyNote('x'.repeat(ANOMALY_NOTE_MAX), 'anomaly')).toBeNull();
  });
});

describe('validateAnomalyNote — perte (note facultative)', () => {
  it('accepte une note vide', () => {
    expect(validateAnomalyNote('', 'lost')).toBeNull();
  });

  it('accepte une note renseignée', () => {
    expect(validateAnomalyNote('Non retrouvé au démontage', 'lost')).toBeNull();
  });

  it('refuse quand même une note trop longue', () => {
    expect(validateAnomalyNote('x'.repeat(ANOMALY_NOTE_MAX + 1), 'lost')).not.toBeNull();
  });
});
