import {explainSyncConflict, explainSyncError} from '@/domain/syncError';

test('404 nomme la cause la plus fréquente : un cache d’une autre base', () => {
  expect(explainSyncError('HTTP 404')).toMatch(/retéléchargez le secteur/i);
});

test('401 et 403 renvoient vers la reconnexion', () => {
  expect(explainSyncError('HTTP 401')).toMatch(/reconnectez/i);
  expect(explainSyncError('HTTP 403')).toMatch(/reconnectez/i);
});

test('un 5xx annonce une reprise automatique', () => {
  expect(explainSyncError('HTTP 503')).toMatch(/repartira/i);
});

test('sans erreur enregistrée, on parle de réseau', () => {
  expect(explainSyncError(null)).toMatch(/réseau/i);
});

test('un message inconnu est rendu tel quel plutôt que masqué', () => {
  expect(explainSyncError('boom')).toBe('boom');
});

test('un conflit 422 dit qu’un autre agent est passé avant, et propose l’arbitrage', () => {
  const m = explainSyncConflict('HTTP 422');
  expect(m).toMatch(/autre agent/i);
  expect(m).toMatch(/rejouez ou abandonnez/i);
});

test('un conflit 409 parle de modification concurrente, pas de transition', () => {
  const m = explainSyncConflict('HTTP 409');
  expect(m).toMatch(/modifié entre-temps/i);
  expect(m).not.toMatch(/autre agent/i);
});

test('un conflit sans motif enregistré reste explicite plutôt que vide', () => {
  expect(explainSyncConflict(null)).toMatch(/conflit/i);
});
