import { z } from 'zod';

const publicEnvSchema = z.object({
	VITE_API_URL: z
		.string({ message: 'API URL is required' })
		.trim()
		.min(1, { message: 'API URL is required' }),
});

const parsed = publicEnvSchema.safeParse(import.meta.env);

if (!parsed.success) {
	const message = parsed.error.issues.map((issue) => issue.message).join(', ');
	throw new Error(`Invalid public environment: ${message}`);
}

export const publicEnv = parsed.data;
