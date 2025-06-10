import { z } from 'zod';
import { batchStatusValues, batchTable, insertBatchSchema, updateBatchSchema } from '../db/schema';
import { BatchService } from '../service/batch';
import { publicProcedure, router } from '../trpc';
import { paginationLimit, paginationOffset } from './input-helpers';
import { orderBySchema } from '../util/order-by-build';
import { getTableColumns } from 'drizzle-orm';

export const batchRouter = router({
	insert: publicProcedure.input(insertBatchSchema).mutation(async ({ input }) => {
		const [batch, err] = await BatchService.insert(input);
		if (err) throw new Error('Failed to insert batch.', { cause: err });
		return batch;
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: updateBatchSchema }))
		.mutation(async ({ input }) => {
			const [batch, err] = await BatchService.update(input.id, input.partial);
			if (err) throw new Error('Failed to update batch.', { cause: err });
			return batch;
		}),

	delete: publicProcedure.input(z.string()).mutation(async ({ input: id }) => {
		const [batch, err] = await BatchService.remove(id);
		if (err) throw new Error('Failed to delete batch.', { cause: err });
		return batch;
	}),

	findByItem: publicProcedure
		.input(
			z.object({
				itemId: z.string(),
				limit: paginationLimit,
				offset: paginationOffset,
				orderBy: orderBySchema(getTableColumns(batchTable)).optional(),
				targetStatus: z.enum(batchStatusValues).default('active'),
			}),
		)
		.query(async ({ input }) => {
            const [batches, err] = await BatchService.getByItem(input.itemId)
        }),
});
