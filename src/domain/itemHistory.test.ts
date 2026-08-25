import {formatCoords, toMovementLines} from '@/domain/itemHistory';
import type {ItemMovement} from '@/types/api';

const mv = (over: Partial<ItemMovement> = {}): ItemMovement => ({
  at: '2026-07-04T10:00:00Z',
  type: 'scan',
  toStatus: 'deployed',
  operatorId: 'u1',
  ...over,
});

describe('toMovementLines', () => {
  it('rend le plus récent en premier', () => {
    // L'API renvoie l'historique dans l'ordre d'écriture ; à l'écran, c'est le
    // dernier geste qui intéresse l'agent.
    const lignes = toMovementLines([
      mv({at: '2026-07-01T08:00:00Z', type: 'allocation'}),
      mv({at: '2026-07-04T10:00:00Z', type: 'deploy'}),
      mv({at: '2026-07-02T09:00:00Z', type: 'transit'}),
    ]);
    expect(lignes.map(l => l.title)).toEqual([
      'Déploiement',
      'Mise en transit',
      'Affectation',
    ]);
  });

  it.each([
    ['scan', 'Pointage'],
    ['allocation', 'Affectation'],
    ['transit', 'Mise en transit'],
    ['deploy', 'Déploiement'],
    ['maintenance', 'Maintenance'],
    ['anomaly', 'Anomalie signalée'],
    ['return', 'Retour au stock'],
  ] as [ItemMovement['type'], string][])('traduit le type %s en « %s »', (type, attendu) => {
    expect(toMovementLines([mv({type})])[0]!.title).toBe(attendu);
  });

  it('affiche la transition quand le statut a changé', () => {
    const l = toMovementLines([mv({fromStatus: 'in_transit', toStatus: 'deployed'})])[0]!;
    expect(l.transition).toBe('En transit → Déployé');
  });

  it('n’affiche pas de transition quand le statut n’a pas bougé', () => {
    // Un pointage ne change rien : « Déployé → Déployé » serait du bruit.
    expect(toMovementLines([mv({fromStatus: 'deployed', toStatus: 'deployed'})])[0]!.transition)
      .toBeNull();
  });

  it('n’affiche pas de transition quand l’origine est inconnue', () => {
    expect(toMovementLines([mv({toStatus: 'deployed'})])[0]!.transition).toBeNull();
  });

  it('formate la date en jj/mm/aaaa et heure', () => {
    // On vérifie la FORME, pas une heure précise : le rendu suit le fuseau de
    // l'appareil, et figer une valeur ferait échouer le test hors de Paris.
    expect(toMovementLines([mv()])[0]!.at).toMatch(/^\d{2}\/\d{2}\/\d{4} · \d{2}:\d{2}$/);
  });

  it('reporte la note quand il y en a une', () => {
    expect(toMovementLines([mv({note: 'Pied cassé'})])[0]!.note).toBe('Pied cassé');
  });

  it('laisse la note vide quand il n’y en a pas', () => {
    expect(toMovementLines([mv()])[0]!.note).toBeUndefined();
  });

  it('signale qu’un mouvement porte une position', () => {
    const avec = mv({location: {type: 'Point', coordinates: [0.141, 49.52]}});
    expect(toMovementLines([avec])[0]!.hasLocation).toBe(true);
    expect(toMovementLines([mv()])[0]!.hasLocation).toBe(false);
  });

  it('accepte un historique vide', () => {
    expect(toMovementLines([])).toEqual([]);
  });

  it('ne mute pas l’historique source', () => {
    const source = [mv({at: '2026-07-01T08:00:00Z'}), mv({at: '2026-07-04T10:00:00Z'})];
    const copie = [...source];
    toMovementLines(source);
    expect(source).toEqual(copie);
  });
});

describe('formatCoords', () => {
  it('affiche latitude puis longitude, à cinq décimales', () => {
    // L'ordre GeoJSON est [lng, lat] ; on l'inverse pour l'affichage, qui se
    // lit toujours « lat, lng ».
    expect(formatCoords(49.520412, 0.141033)).toBe('49.52041, 0.14103');
  });

  it('renvoie null quand la position est absente', () => {
    expect(formatCoords(null, null)).toBeNull();
    expect(formatCoords(49.5, null)).toBeNull();
  });
});
