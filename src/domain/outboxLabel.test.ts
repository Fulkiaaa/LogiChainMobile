import {
  ACTION_LABELS,
  describeRow,
  relativeTime,
  shortRef,
} from '@/domain/outboxLabel';
import type { OutboxActionType } from '@/services/db/outbox.repo';

describe('libellés d’action', () => {
  const tous: OutboxActionType[] = [
    'scan',
    'transit',
    'deploy',
    'anomaly',
    'lost',
    'maintenance',
    'allocate',
    'return',
  ];

  test.each(tous)('« %s » a un libellé en français', type => {
    const libelle = ACTION_LABELS[type];
    expect(libelle).toBeTruthy();
    // Un libellé technique laissé tel quel trahirait un oubli dans la table.
    expect(libelle).not.toBe(type);
  });

  test('aucun libellé n’est dupliqué : deux gestes ne peuvent pas se confondre', () => {
    const libelles = Object.values(ACTION_LABELS);
    expect(new Set(libelles).size).toBe(libelles.length);
  });
});

describe('référence courte d’équipement', () => {
  test('garde les six derniers caractères, en majuscules', () => {
    expect(shortRef('11111111-2222-3333-4444-5aaa3f2e41')).toBe(
      'A3F2E41'.slice(-6),
    );
  });

  test('un identifiant plus court qu’attendu passe sans lever', () => {
    expect(shortRef('ab')).toBe('AB');
  });
});

describe('description d’une ligne de file d’attente', () => {
  test('préfère le libellé de l’équipement à son identifiant', () => {
    expect(describeRow('scan', 'item-a3f2e4', 'Praticable scène B')).toBe(
      'Pointage · Praticable scène B',
    );
  });

  test('retombe sur la référence courte quand le cache ne connaît pas l’équipement', () => {
    // Cas réel : une action posée hors ligne sur un équipement d'un autre
    // secteur, jamais téléchargé.
    expect(describeRow('lost', 'item-a3f2e4', null)).toBe(
      'Déclaration de perte · équipement A3F2E4',
    );
  });

  test('un libellé vide est traité comme absent', () => {
    expect(describeRow('scan', 'item-a3f2e4', '   ')).toBe(
      'Pointage · équipement A3F2E4',
    );
  });
});

describe('temps relatif', () => {
  const maintenant = new Date('2026-08-27T12:00:00.000Z');
  const ilYA = (ms: number) =>
    new Date(maintenant.getTime() - ms).toISOString();

  const SEC = 1000,
    MIN = 60 * SEC,
    HEURE = 60 * MIN,
    JOUR = 24 * HEURE;

  test('moins d’une minute se dit « à l’instant »', () => {
    expect(relativeTime(ilYA(30 * SEC), maintenant)).toBe('à l’instant');
  });

  test('les minutes s’affichent en minutes', () => {
    expect(relativeTime(ilYA(12 * MIN), maintenant)).toBe('il y a 12 min');
  });

  test('au-delà d’une heure, on passe aux heures', () => {
    expect(relativeTime(ilYA(3 * HEURE), maintenant)).toBe('il y a 3 h');
  });

  test('au-delà d’un jour, on passe aux jours', () => {
    expect(relativeTime(ilYA(4 * JOUR), maintenant)).toBe('il y a 4 j');
  });

  test('une date future ne produit pas de durée négative', () => {
    // L'horloge du terminal peut être en avance sur celle du serveur.
    expect(relativeTime(ilYA(-5 * MIN), maintenant)).toBe('à l’instant');
  });

  test('une date illisible ne fait pas planter la file', () => {
    expect(relativeTime('pas une date', maintenant)).toBe('date inconnue');
  });
});
