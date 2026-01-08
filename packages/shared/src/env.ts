import { createEnv } from '@t3-oss/env-core';
import { config } from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'node:url';

const isServer = () => {
	return typeof window === 'undefined';
};

const loadRuntime = () => {
	if (!isServer()) return import.meta.env;

	const nodeEnv = process.env.NODE_ENV || 'development';
	const envFiles = [`.env`, `.env.${nodeEnv}`, `.env.${nodeEnv}.local`];
	const repoRootUrl = new URL('../../..', import.meta.url);

	for (const file of envFiles) {
		const envPath = fileURLToPath(new URL(file, repoRootUrl));
		config({ path: envPath, override: true });
	}

	return process.env;
};

const resolveDbUrl = (value: string) => {
	const hasProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value);
	const urlValue = hasProtocol ? value : `file:${value}`;

	if (!urlValue.startsWith('file:')) return urlValue;

	const rawPath = urlValue.slice('file:'.length);
	if (!rawPath || rawPath.startsWith('//')) return urlValue;

	const repoRootUrl = new URL('../../..', import.meta.url);
	const resolved = new URL(rawPath, repoRootUrl);
	return resolved.href;
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
		DB_FILENAME: z.string().transform(resolveDbUrl),
		PORT: z.coerce.number().default(3000),
	},
});
