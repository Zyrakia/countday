import Database from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

import { env } from '../env';
import * as schema from './schema';

const sqlite = new Database(env.DB_FILENAME);
sqlite.exec('PRAGMA foreign_keys = ON');

const _db = drizzle(sqlite, { casing: 'snake_case', schema });
export type DatabaseClient = Omit<typeof _db, '$client'>;

const db = _db as DatabaseClient;
export { db };
