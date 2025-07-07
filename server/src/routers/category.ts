import { z } from 'zod';
import { insertCategorySchema, updateCategorySchema, categoryTable } from '../db/schema';
import { publicProcedure, router } from '../trpc';
import { orderBySchema } from './input-helpers';
import { getTableColumns } from 'drizzle-orm';
import { CategoryService } from '../service/category';

export const categoryRouter = router({
	insert: publicProcedure.input(insertCategorySchema).mutation(async ({ input }) => {
		const [category, err] = await CategoryService.insert(input);
		if (err) throw new Error('Failed to insert category.', { cause: err });
		return category;
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: updateCategorySchema }))
		.mutation(async ({ input }) => {
			const [category, err] = await CategoryService.update(input.id, input.partial);
			if (err) throw new Error('Failed to update category.', { cause: err });
			return category;
		}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [category, err] = await CategoryService.remove(id);
		if (err) throw new Error('Failed to delete category.', { cause: err });
		return category;
	}),

	getDeleteImpact: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [impact, err] = await CategoryService.getDeleteImpact(id);
		if (err) throw new Error('Failed to get category delete impact.', { cause: err });
		return impact;
	}),

	getOne: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [category, err] = await CategoryService.getOne(id);
		if (err) throw new Error('Failed to obtain category.', { cause: err });
		return category;
	}),

	get: publicProcedure
		.input(
			z.object({
				orderBy: orderBySchema(getTableColumns(categoryTable)).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [categories, err] = await CategoryService.get(input.orderBy);
			if (err) throw new Error('Failed to obtain categories.', { cause: err });
			return categories;
		}),
});
