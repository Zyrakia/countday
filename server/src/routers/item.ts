import { z } from 'zod';
import { itemTable } from '../db/schema';
import { insertItemSchema, updateItemSchema } from '../schemas';
import { publicProcedure, router } from '../trpc';
import { orderBySchema, paginationLimit, paginationOffset } from './input-helpers';
import { getTableColumns } from 'drizzle-orm';
import { ItemService } from '../service/item';

export const itemRouter = router({
	insert: publicProcedure.input(insertItemSchema).mutation(async ({ input }) => {
		const [item, err] = await ItemService.insert(input);
		if (err) throw new Error('Failed to insert item.', { cause: err });
		return item;
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: updateItemSchema }))
		.mutation(async ({ input }) => {
			const [item, err] = await ItemService.update(input.id, input.partial);
			if (err) throw new Error('Failed to update item.', { cause: err });
			return item;
		}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [item, err] = await ItemService.remove(id);
		if (err) throw new Error('Failed to delete item.', { cause: err });
		return item;
	}),

	getDeleteImpact: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [impact, err] = await ItemService.getDeleteImpact(id);
		if (err) throw new Error('Failed to get item delete impact.', { cause: err });
		return impact;
	}),

	getOne: publicProcedure.input(z.string()).query(async ({ input: idOrFormId }) => {
		// ItemService.getOne currently throws if not found
		const [item, err] = await ItemService.getOne(idOrFormId);
		if (err) throw new Error('Failed to obtain item.', { cause: err });
		return item;
	}),

	get: publicProcedure
		.input(
			z.object({
				limit: paginationLimit,
				offset: paginationOffset,
				orderBy: orderBySchema(getTableColumns(itemTable)).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [items, err] = await ItemService.get(input.limit, input.offset, input.orderBy);
			if (err) throw new Error('Failed to obtain items.', { cause: err });
			return items;
		}),

	find: publicProcedure
		.input(
			z.object({
				query: z.string().min(1),
				limit: paginationLimit,
				offset: paginationOffset,
				orderBy: orderBySchema(getTableColumns(itemTable)).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [items, err] = await ItemService.find(
				input.query,
				input.limit,
				input.offset,
				input.orderBy,
			);
			if (err) throw new Error('Failed to find items.', { cause: err });
			return items;
		}),
});
