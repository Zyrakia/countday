import { z } from 'zod';
import { batchStatusValues, itemTable } from '../db/schema';
import { insertBatchSchema } from '../schemas';
import { StockService, ConsumptionMethod } from '../service/stock';
import { publicProcedure, router } from '../trpc';
import { orderBySchema, paginationLimit, paginationOffset } from './input-helpers';
import { getTableColumns } from 'drizzle-orm';

export const stockRouter = router({
	getItemQty: publicProcedure
		.input(
			z.object({
				id: z.string(),
				qtyType: z.enum(batchStatusValues).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [qty, err] = await StockService.getItemQty(input.id, input.qtyType);
			if (err) throw new Error('Failed to get item quantity.', { cause: err });
			return qty;
		}),

	getItemWithQty: publicProcedure
		.input(
			z.object({
				idOrFormId: z.string(),
				qtyType: z.enum(batchStatusValues).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [itemWithQty, err] = await StockService.getItemWithQty(input.idOrFormId, input.qtyType);
			if (err) throw new Error('Failed to get item with quantity.', { cause: err });
			return itemWithQty;
		}),

	getBatchSummary: publicProcedure
		.input(
			z.object({
				itemId: z.string(),
				limit: z.number().int().min(1).default(5),
			}),
		)
		.query(async ({ input }) => {
			const [batches, err] = await StockService.getBatchSummary(input.itemId, input.limit);
			if (err) throw new Error('Failed to get batch summary.', { cause: err });
			return batches;
		}),

	getItems: publicProcedure
		.input(
			z.object({
				qtyType: z.enum(batchStatusValues),
				limit: paginationLimit,
				offset: paginationOffset,
				orderBy: orderBySchema({ ...getTableColumns(itemTable), totalQty: z.number() }).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [items, err] = await StockService.getItems(
				input.qtyType,
				input.limit,
				input.offset,
				input.orderBy,
			);
			if (err) throw new Error('Failed to get stock items.', { cause: err });
			return items;
		}),

	findItems: publicProcedure
		.input(
			z.object({
				query: z.string().min(1),
				qtyType: z.enum(batchStatusValues),
				limit: paginationLimit,
				offset: paginationOffset,
				orderBy: orderBySchema({ ...getTableColumns(itemTable), totalQty: z.number() }).optional(),
			}),
		)
		.query(async ({ input }) => {
			const [items, err] = await StockService.findItems(
				input.query,
				input.qtyType,
				input.limit,
				input.offset,
				input.orderBy,
			);
			if (err) throw new Error('Failed to find stock items.', { cause: err });
			return items;
		}),

	consume: publicProcedure
		.input(
			z.object({
				itemId: z.string(),
				quantity: z.number().nonnegative(),
				method: z.nativeEnum(ConsumptionMethod).default(ConsumptionMethod.FIFO),
			}),
		)
		.mutation(async ({ input }) => {
			const [remainingQty, err] = await StockService.consume(
				input.itemId,
				input.quantity,
				input.method,
			);
			if (err) throw new Error('Failed to consume stock.', { cause: err });
			return remainingQty;
		}),

	receive: publicProcedure.input(insertBatchSchema).mutation(async ({ input }) => {
		const [batch, err] = await StockService.receive(input);
		if (err) throw new Error('Failed to receive stock batch.', { cause: err });
		return batch;
	}),

	reconcileCount: publicProcedure.input(z.string()).mutation(async ({ input: countId }) => {
		const [, err] = await StockService.reconcileCount(countId);
		if (err) throw new Error('Failed to reconcile count.', { cause: err });
	}),
});
