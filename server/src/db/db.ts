import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { serverEnv } from '@countday/shared/env/server';
import * as schema from './schema';

const sqlite = createClient({ url: serverEnv.DB_FILENAME });

const _db = drizzle(sqlite, { casing: 'snake_case', schema });
export type DatabaseClient = Omit<typeof _db, '$client' | 'batch'>;

const db = _db as DatabaseClient;
export { db };
