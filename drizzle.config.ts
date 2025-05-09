import 'dotenv/config';

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/db/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: {
		url: process.env.DB_FILENAME!,
	},
});
