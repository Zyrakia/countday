import { createEnv } from '@t3-oss/env-core';
import { config } from 'dotenv';
import { z } from 'zod';

const isServer = () => {
	return typeof window === 'undefined';
};

const loadRuntime = () => {
	if (!isServer()) return import.meta.env;

	const nodeEnv = process.env.NODE_ENV || 'development';
	const envFiles = [`.env`, `.env.${nodeEnv}`, `.env.${nodeEnv}.local`];
	const repoRootUrl = new URL('../../..', import.meta.url);

	for (const file of envFiles) {
		const envPath = new URL(file, repoRootUrl).pathname;
		config({ path: envPath, override: true });
	}
	return process.env;
};

export const env = createEnv({
	isServer: isServer(),
	runtimeEnv: loadRuntime(),
	emptyStringAsUndefined: true,

	clientPrefix: 'VITE_',
	client: {
		VITE_API_URL: z.string(),
	},
	server: {
		SERVICE_NAME: z.string(),
		DB_FILENAME: z.string(),
		PORT: z.coerce.number().default(3000),
	},
});
