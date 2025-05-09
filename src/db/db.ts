import Database from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { env } from '../env';
import * as schema from './schema';

export const db = drizzle(new Database(env.DB_FILENAME), { casing: 'snake_case', schema });
