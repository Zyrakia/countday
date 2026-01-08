import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

import { env } from '@countday/shared';
import * as schema from './schema';

const resolveDbUrl = (url: string) => {
	if (!url.startsWith('file:')) return url;

	const rawPath = url.slice('file:'.length);
	if (!rawPath || rawPath.startsWith('//')) return url;

	const repoRootUrl = new URL('../../..', import.meta.url);
	const resolved = new URL(rawPath, repoRootUrl);
	return resolved.href;
};

const sqlite = createClient({ url: resolveDbUrl(env.DB_FILENAME) });

const _db = drizzle(sqlite, { casing: 'snake_case', schema });
export type DatabaseClient = Omit<typeof _db, '$client'>;

const db = _db as DatabaseClient;
export { db };
