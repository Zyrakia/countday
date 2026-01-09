import { z } from 'zod';
import { lineLimit } from '../utils/line-limit';

export const CategoryBaseSchema = z.object({
	id: z.string().min(1, { message: 'ID is required' }),
	name: z
		.string({ error: 'Name is required' })
		.trim()
		.min(1, { message: 'Name is required' })
		.max(120, { message: 'Maximum 120 characters' })
		.pipe(lineLimit(1)),
	description: z
		.string()
		.trim()
		.max(1000, { message: 'Maximum 1000 characters' })
		.pipe(lineLimit(10))
		.optional(),
});

export const CreateCategorySchema = CategoryBaseSchema.omit({ id: true });
export const UpdateCategorySchema = CreateCategorySchema.partial();

export type Category = z.infer<typeof CategoryBaseSchema>;
