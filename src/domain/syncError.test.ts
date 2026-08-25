import {explainSyncError} from '@/domain/syncError';

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
