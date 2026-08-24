import {createGuardedFlush} from '@/services/sync/runFlush';

const résultat = {synced: 1, conflicts: 0, failed: 0, rolledBack: 0};

test('deux flush lancés en même temps : un seul s’exécute vraiment', async () => {
  let appels = 0;
  const flush = createGuardedFlush(async () => {
    appels++;
    await new Promise<void>(r => setTimeout(() => r(), 20));
    return résultat;
  });

  // Les deux écrans montés déclenchent la synchro au retour du réseau.
  const [a, b] = await Promise.all([flush(), flush()]);

  expect(appels).toBe(1);
  expect(a).toEqual(résultat);
  expect(b).toBeNull(); // le second est ignoré, pas dupliqué
});

test('le verrou est relâché : un flush ultérieur passe', async () => {
  let appels = 0;
  const flush = createGuardedFlush(async () => {
    appels++;
    return résultat;
  });

  await flush();
  await flush();
  expect(appels).toBe(2);
});

test('le verrou est relâché même si le flush échoue', async () => {
  let appels = 0;
  const flush = createGuardedFlush(async () => {
    appels++;
    throw new Error('réseau coupé');
  });

  await expect(flush()).rejects.toThrow('réseau coupé');
  await expect(flush()).rejects.toThrow('réseau coupé');
  expect(appels).toBe(2); // pas bloqué définitivement par le premier échec
});
