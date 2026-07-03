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
