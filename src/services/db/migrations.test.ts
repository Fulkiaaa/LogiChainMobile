import {MIGRATIONS, runMigrations} from './migrations';
import {createNodeSqlDb} from './nodeSqlite.testadapter';

const ddl = MIGRATIONS.join('\n');

test('crée les tables cache + outbox + meta', () => {
  ['items', 'events', 'zones', 'outbox', 'sync_meta'].forEach(t =>
    expect(ddl).toContain(`CREATE TABLE IF NOT EXISTS ${t}`),
  );
});

test('index qrCode présent', () => {
  expect(ddl).toContain('idx_items_qrCode');
});

test('runMigrations crée un schéma interrogeable', () => {
  const db = createNodeSqlDb();
  runMigrations(db);
  // Insère puis relit : le schéma est fonctionnel.
  db.run("INSERT INTO sync_meta (key,value) VALUES ('k','v')");
  expect(db.get<{value: string}>("SELECT value FROM sync_meta WHERE key='k'")?.value).toBe('v');
});
