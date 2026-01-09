import { z } from 'zod';
import { batchTable } from '../db/schema';
import { BatchService } from '../service/batch';
import { publicProcedure, router } from '../trpc';
import { orderBySchema, paginationLimit, paginationOffset } from './input-helpers';
import { eq, getTableColumns } from 'drizzle-orm';
import { BatchStatusValues, CreateBatchSchema, UpdateBatchSchema } from '@countday/shared';

export const batchRouter = router({
	insert: publicProcedure.input(CreateBatchSchema).mutation(async ({ input }) => {
		const [batch, err] = await BatchService.insert(input);
		if (err) throw new Error('Failed to insert batch.', { cause: err });
		return batch;
	}),

	update: publicProcedure
		.input(z.object({ id: z.string(), partial: UpdateBatchSchema }))
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
				targetStatus: z.enum(BatchStatusValues).default('active'),
			}),
		)
		.query(async ({ input }) => {
			const [batches, err] = await BatchService.getByItem(
				input.itemId,
				input.limit,
				input.offset,
				input.orderBy,
				eq(batchTable.status, input.targetStatus),
			);

			if (err) throw new Error('Failed to obtain batches.', { cause: err });
			return batches;
		}),
});
