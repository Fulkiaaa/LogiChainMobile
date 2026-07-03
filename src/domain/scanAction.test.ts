import { resolveScanAction } from '@/domain/scanAction';

test('mode deploy sur in_transit → deploy', () => {
  const r = resolveScanAction('deploy','in_transit');
  expect(r.ok && r.action.actionType).toBe('deploy');
});

test('mode deploy sur in_stock → refusé', () => {
  const r = resolveScanAction('deploy','in_stock');
  expect(r.ok).toBe(false);
});

test('pointage toujours accepté (pas de transition)', () => {
  const r = resolveScanAction('pointage','deployed');
  expect(r.ok && r.action.actionType).toBe('scan');
});
