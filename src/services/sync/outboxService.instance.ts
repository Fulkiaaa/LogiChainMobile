import {itemsRepo, outboxRepo} from '@/services/db/database';

import {createOutboxService} from './OutboxService';

/** OutboxService réel, câblé sur le SQLite de production. */
export const outboxService = createOutboxService({
  items: itemsRepo,
  outbox: outboxRepo,
});
