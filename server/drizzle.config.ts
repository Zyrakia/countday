import { serverEnv } from '@countday/shared/env/server';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/db/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: {
		url: serverEnv.DB_FILENAME,
	},
});
