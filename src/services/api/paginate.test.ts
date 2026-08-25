import {fetchAllPages} from '@/services/api/paginate';

type Row = {id: string};

/** Fabrique une réponse paginée conforme à l'enveloppe de l'API LogiChain. */
const page = (data: Row[], p: number, totalPages: number) => ({
  data,
  count: totalPages * 100,
  page: p,
  limit: 100,
  totalPages,
});

test('une seule page : un seul appel réseau', async () => {
  const fetchPage = jest.fn(async () => page([{id: 'a'}, {id: 'b'}], 1, 1));
  const rows = await fetchAllPages(fetchPage);
  expect(rows).toEqual([{id: 'a'}, {id: 'b'}]);
  expect(fetchPage).toHaveBeenCalledTimes(1);
});

test('trois pages : concatène tout, dans l\'ordre, page par page', async () => {
  const fetchPage = jest.fn(async (p: number) => page([{id: `i${p}`}], p, 3));
  const rows = await fetchAllPages(fetchPage);
  expect(rows).toEqual([{id: 'i1'}, {id: 'i2'}, {id: 'i3'}]);
  expect(fetchPage.mock.calls.map(c => c[0])).toEqual([1, 2, 3]);
});

test('récupère au-delà de la limite serveur de 100', async () => {
  const bloc = (p: number) =>
    Array.from({length: 100}, (_, i) => ({id: `p${p}-${i}`}));
  const fetchPage = jest.fn(async (p: number) => page(bloc(p), p, 2));
  const rows = await fetchAllPages(fetchPage, {keyOf: r => r.id});
  expect(rows).toHaveLength(200);
});

test('dédoublonne les recouvrements entre pages (tri non départagé côté API)', async () => {
  // `createdAt: -1` sans départage : « b » peut réapparaître page 2.
  const pages: Record<number, Row[]> = {
    1: [{id: 'a'}, {id: 'b'}],
    2: [{id: 'b'}, {id: 'c'}],
  };
  const fetchPage = async (p: number) => page(pages[p]!, p, 2);
  const rows = await fetchAllPages(fetchPage, {keyOf: r => r.id});
  expect(rows).toEqual([{id: 'a'}, {id: 'b'}, {id: 'c'}]);
});

test('sans keyOf, aucun dédoublonnage : on ne suppose pas d\'identifiant', async () => {
  const pages: Record<number, Row[]> = {1: [{id: 'a'}], 2: [{id: 'a'}]};
  const fetchPage = async (p: number) => page(pages[p]!, p, 2);
  const rows = await fetchAllPages(fetchPage);
  expect(rows).toHaveLength(2);
});

test('totalPages absent : on s\'arrête au lieu de boucler à l\'aveugle', async () => {
  const fetchPage = jest.fn(async () => ({data: [{id: 'a'}]}) as never);
  const rows = await fetchAllPages(fetchPage);
  expect(rows).toEqual([{id: 'a'}]);
  expect(fetchPage).toHaveBeenCalledTimes(1);
});

test('page vide alors que l\'API en annonce d\'autres : on coupe court', async () => {
  const fetchPage = jest.fn(async (p: number) =>
    p === 1 ? page([{id: 'a'}], 1, 5) : page([], p, 5),
  );
  const rows = await fetchAllPages(fetchPage);
  expect(rows).toEqual([{id: 'a'}]);
  expect(fetchPage).toHaveBeenCalledTimes(2);
});

test('cap de pages atteint : lève plutôt que de cacher un secteur tronqué', async () => {
  const fetchPage = async (p: number) => page([{id: `i${p}`}], p, 999);
  await expect(fetchAllPages(fetchPage, {maxPages: 3})).rejects.toThrow(
    /Pagination interrompue/,
  );
});
