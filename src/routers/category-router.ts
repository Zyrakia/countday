import { z } from 'zod';
import { insertCategorySchema, updateCategorySchema } from '../db/schema';
import { CategoryService } from '../service/category';
import { publicProcedure, router } from '../trpc';

export const categoryRouter = router({
	insert: publicProcedure.input(insertCategorySchema).mutation(async ({ input }) => {
		return await CategoryService.insert(input);
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: updateCategorySchema }))
		.mutation(async ({ input }) => {
			return await CategoryService.update(input.id, input.partial);
		}),

	delete: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
		return await CategoryService.remove(input.id);
	}),

	getDeleteImpact: publicProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ input }) => {
			return await CategoryService.getDeleteImpact(input.id);
		}),

	getOne: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
		return await CategoryService.getOne(input.id);
	}),

	getAll: publicProcedure.query(async () => {
		return await CategoryService.get();
	}),
});
