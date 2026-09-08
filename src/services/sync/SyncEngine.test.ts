import { createSyncEngine } from '@/services/sync/SyncEngine';
test('flush: succès supprime la ligne, conflit la marque', async () => {
  const rows = [
    { localId:'a', status:'pending', attempts:0, entityId:'i1', actionType:'deploy', payload:'{}', baseVersion:1 },
    { localId:'b', status:'pending', attempts:0, entityId:'i2', actionType:'deploy', payload:'{}', baseVersion:1 },
  ] as any[];
  const removed: string[] = []; const marked: any[] = [];
  const engine = createSyncEngine({
    maxAttempts: 5,
    outbox: { listPending: () => rows, remove: (id: string) => removed.push(id), mark: (id: string, s: string) => marked.push([id, s]) },
    sendAction: async (r: any) => r.localId === 'a' ? { httpStatus: 200, item: { id:'i1' } } : { httpStatus: 409 },
    applyServerItem: () => {},
  });
  const res = await engine.flush();
  expect(res.synced).toBe(1); expect(res.conflicts).toBe(1);
  expect(removed).toEqual(['a']);
  expect(marked).toEqual([['b','conflict']]);
});

test('flush: échec réseau non définitif -> réessai, aucun rollback', async () => {
  const rows = [{localId: 'a', status: 'pending', attempts: 0, entityId: 'i1', actionType: 'deploy', payload: '{}', baseVersion: 1}] as any[];
  const marked: any[] = []; const rolled: string[] = [];
  const engine = createSyncEngine({
    maxAttempts: 3,
    outbox: {listPending: () => rows, remove: () => {}, mark: (id: string, s: string) => marked.push([id, s])},
    sendAction: async () => ({httpStatus: 500}),
    applyServerItem: () => {},
    rollback: (r: any) => rolled.push(r.localId),
  });
  const res = await engine.flush();
  expect(res.failed).toBe(1);
  expect(marked).toEqual([['a', 'failed']]);
  expect(rolled).toEqual([]); // il reste des tentatives : on ne revient pas en arrière
});

test('flush: échec définitif -> rollback visuel + retrait de la file', async () => {
  const rows = [{localId: 'a', status: 'failed', attempts: 2, entityId: 'i1', actionType: 'deploy', payload: '{}', baseVersion: 1}] as any[];
  const removed: string[] = []; const marked: any[] = []; const rolled: string[] = [];
  const engine = createSyncEngine({
    maxAttempts: 3, // 2 + 1 = 3 -> on abandonne
    outbox: {listPending: () => rows, remove: (id: string) => removed.push(id), mark: (id: string, s: string) => marked.push([id, s])},
    sendAction: async () => ({httpStatus: 500}),
    applyServerItem: () => {},
    rollback: (r: any) => rolled.push(r.localId),
  });
  const res = await engine.flush();
  expect(res.rolledBack).toBe(1);
  expect(rolled).toEqual(['a']);   // l'état optimiste est annulé
  expect(removed).toEqual(['a']);  // la ligne quitte la file
  expect(marked).toEqual([]);      // et n'est pas laissée en "conflit"
});

test('flush: un conflit 409 n’est PAS rollbacké — il attend l’arbitrage', async () => {
  const rows = [{localId: 'a', status: 'pending', attempts: 0, entityId: 'i1', actionType: 'deploy', payload: '{}', baseVersion: 1}] as any[];
  const rolled: string[] = []; const marked: any[] = [];
  const engine = createSyncEngine({
    maxAttempts: 3,
    outbox: {
      listPending: () => rows,
      remove: () => {},
      mark: (id: string, s: string, e?: string) => marked.push([id, s, e]),
    },
    sendAction: async () => ({httpStatus: 409}),
    applyServerItem: () => {},
    rollback: (r: any) => rolled.push(r.localId),
  });
  const res = await engine.flush();
  expect(res.conflicts).toBe(1);
  expect(rolled).toEqual([]);
  // Le motif est conservé : le centre de synchro s'en sert pour expliquer le
  // conflit à l'agent au lieu d'afficher un libellé générique.
  expect(marked).toEqual([['a', 'conflict', 'HTTP 409']]);
});
