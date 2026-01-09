import { z } from 'zod';
import { lineLimit } from '../utils/line-limit';

export const LocationBaseSchema = z.object({
	id: z.string().min(1, { message: 'ID is required' }),
	name: z
		.string({ error: 'Name is required' })
		.trim()
		.min(1, { message: 'Name is required' })
		.max(120, { message: 'Maximum 120 characters' })
		.pipe(lineLimit(1)),
});

export const CreateLocationSchema = LocationBaseSchema.omit({ id: true });
export const UpdateLocationSchema = CreateLocationSchema.partial();

export type Location = z.infer<typeof LocationBaseSchema>;
