import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { pathToFileURL } from 'node:url';
import { z } from 'zod';

const mode = process.env.NODE_ENV ?? process.env.BUN_ENV ?? 'development';

const envFiles = [`.env.${mode}.local`, `.env.${mode}`, '.env.local', '.env'];

const resolveRepoRoot = () => {
	const cwd = process.cwd();
	const parent = resolve(cwd, '..');
	const hasEnvFiles = (dir: string) =>
		envFiles.some((envFile) => existsSync(resolve(dir, envFile)));

	if (hasEnvFiles(cwd)) return cwd;
	if (hasEnvFiles(parent)) return parent;
	return cwd;
};

const repoRoot = resolveRepoRoot();

for (const envFile of envFiles) {
	const envPath = resolve(repoRoot, envFile);
	if (existsSync(envPath)) config({ path: envPath });
}

const requiredString = (message: string) => z.string({ message }).trim().min(1, { message });

const resolveDbUrl = (value: string) => {
	if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) && !value.startsWith('file:')) {
		return value;
	}

	const rawPath = value.startsWith('file:') ? value.slice('file:'.length) : value;
	return pathToFileURL(resolve(repoRoot, rawPath)).href;
};

const serverEnvSchema = z.object({
	SERVICE_NAME: requiredString('Service name is required'),
	DB_FILENAME: requiredString('Database file is required').transform((value) =>
		resolveDbUrl(value),
	),
	PORT: z.coerce
		.number()
		.int()
		.min(1, { message: 'Port must be between 1 and 65535' })
		.max(65535, { message: 'Port must be between 1 and 65535' })
		.default(3000),
});

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success) {
	const message = parsed.error.issues.map((issue) => issue.message).join(', ');
	throw new Error(`Invalid server environment: ${message}`);
}

export const serverEnv = parsed.data;
