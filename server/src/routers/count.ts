import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { orderBySchema, paginationLimit, paginationOffset } from './input-helpers';
import { insertItemCountSchema, insertCountDriftSchema, countTable, itemTable } from '../db/schema';
import { getTableColumns } from 'drizzle-orm';
import { CountService } from '../service/count';

export const countRouter = router({
	start: publicProcedure.mutation(async () => {
		const [count, err] = await CountService.start();
		if (err) throw new Error('Failed to start count.', { cause: err });
		return count;
	}),

	finish: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [count, err] = await CountService.finish(id);
		if (err) throw new Error('Failed to finish count.', { cause: err });
		return count;
	}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [count, err] = await CountService.remove(id);
		if (err) throw new Error('Failed to delete count.', { cause: err });
		return count;
	}),

	getOne: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		const [count, err] = await CountService.getOne(id);
		if (err) throw new Error('Failed to obtain count.', { cause: err });
		return count;
	}),

	get: publicProcedure
		.input(
			z.object({
				orderBy: orderBySchema(getTableColumns(countTable)).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [counts, err] = await CountService.get(input.orderBy);
			if (err) throw new Error('Failed to obtain counts.', { cause: err });
			return counts;
		}),

	countItem: publicProcedure.input(insertItemCountSchema).mutation(async ({ input }) => {
		const [itemCount, err] = await CountService.countItem(input);
		if (err) throw new Error('Failed to count item.', { cause: err });
		return itemCount;
	}),

	getDrifts: publicProcedure.input(z.string()).query(async ({ input: countId }) => {
		const [drifts, err] = await CountService.getDrifts(countId);
		if (err) throw new Error('Failed to obtain drifts.', { cause: err });
		return drifts;
	}),

	clearDrifts: publicProcedure
		.input(z.object({ countId: z.string(), itemId: z.string().optional() }))
		.mutation(async ({ input }) => {
			const [clearedDrifts, err] = await CountService.clearDrifts(input.countId, input.itemId);
			if (err) throw new Error('Failed to clear drifts.', { cause: err });
			return clearedDrifts;
		}),

	getActiveCountsForItem: publicProcedure.input(z.string()).query(async ({ input: itemId }) => {
		const [counts, err] = await CountService.getActiveCountsForItem(itemId);
		if (err) throw new Error('Failed to get active counts for item.', { cause: err });
		return counts;
	}),

	processDrift: publicProcedure.input(insertCountDriftSchema).mutation(async ({ input }) => {
		const [, err] = await CountService.processDrift(input); // processDrift returns void/null data
		if (err) throw new Error('Failed to process drift.', { cause: err });
		return { success: true }; // Return a success indicator
	}),

	getProgress: publicProcedure.input(z.string()).query(async ({ input: id }) => {
		// Note: The `where` clause in service is not exposed via Zod
		const [progress, err] = await CountService.getProgress(id);
		if (err) throw new Error('Failed to get count progress.', { cause: err });
		return progress;
	}),

	getItems: publicProcedure
		.input(
			z.object({
				id: z.string(),
				limit: paginationLimit,
				offset: paginationOffset,
				orderBy: orderBySchema(
					// This should align with the actual return type of getItems.
					// If completedCounts is a new property, you need to include it here for orderBySchema
					{ ...getTableColumns(itemTable), completedCounts: z.number() },
				).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [items, err] = await CountService.getItems(
				input.id,
				input.limit,
				input.offset,
				input.orderBy,
			);
			if (err) throw new Error('Failed to get items for count.', { cause: err });
			return items;
		}),
});
