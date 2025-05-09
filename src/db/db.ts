import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../env';

export const db = drizzle(new Database(env.DB_FILENAME), { casing: 'snake_case' });
