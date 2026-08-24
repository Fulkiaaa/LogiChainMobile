import {toAlert} from '@/domain/alert';

// Charge utile réelle capturée sur le flux SSE de production le 2026-08-24.
const RÉEL = {
  id: '6a8c39c206acd2b8703364ab',
  version: 0,
  createdAt: '2026-08-24T12:32:02.792Z',
  updatedAt: '2026-08-24T12:32:02.792Z',
  type: 'anomaly',
  severity: 'critical',
  title: 'Anomalie — Table pliante pro',
  message: 'TEST SSE soutenance — pied de barriere tordu',
  eventId: '6a441ddb4ffbd504544405b1',
  itemId: '6a441ddb4ffbd504544405f6',
  audience: ['admin', 'logistics_manager', 'field_agent'],
  read: false,
};

test('convertit la charge utile réelle du serveur', () => {
  const a = toAlert(JSON.stringify(RÉEL));
  expect(a).not.toBeNull();
  expect(a!.id).toBe('6a8c39c206acd2b8703364ab');
  expect(a!.type).toBe('anomaly');
  expect(a!.severity).toBe('critical');
  expect(a!.title).toBe('Anomalie — Table pliante pro');
  expect(a!.message).toBe('TEST SSE soutenance — pied de barriere tordu');
  // Le serveur envoie createdAt, pas "at" : c'est lui qui fait foi.
  expect(a!.at).toBe('2026-08-24T12:32:02.792Z');
});

test('ignore un heartbeat ou un contenu non-JSON', () => {
  expect(toAlert(': ping')).toBeNull();
  expect(toAlert('')).toBeNull();
  expect(toAlert(null)).toBeNull();
});

test('ignore la poignée de main de connexion (pas une alerte)', () => {
  expect(toAlert(JSON.stringify({ok: true}))).toBeNull();
});

test('tolère une alerte partielle sans planter', () => {
  const a = toAlert(JSON.stringify({id: 'x', message: 'Perte signalée'}));
  expect(a).not.toBeNull();
  expect(a!.message).toBe('Perte signalée');
  expect(a!.severity).toBe('info');
});

test('se rabat sur le titre quand le message est absent', () => {
  const a = toAlert(JSON.stringify({id: 'y', title: 'Équipement perdu'}));
  expect(a!.message).toBe('Équipement perdu');
});
