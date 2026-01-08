import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { env } from '@countday/shared';
import * as schema from './schema';

const sqlite = createClient({ url: env.DB_FILENAME });

const _db = drizzle(sqlite, { casing: 'snake_case', schema });
export type DatabaseClient = Omit<typeof _db, '$client' | 'batch'>;

const db = _db as DatabaseClient;
export { db };
