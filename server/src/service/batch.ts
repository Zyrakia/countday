import { and, eq, SQL } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '../db/db';
import { DatabaseBatch, batchTable } from '../db/schema';
import { insertBatchSchema, updateBatchSchema } from '../schemas';
import { createService } from '../util/create-service';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { nowIso } from '../util/time';
import { ItemService } from './item';

/**
 * Handles RUD operations for batches. Creation of batches
 * is handled in the stock service.
 */
export const BatchService = createService(db, {
	/**
	 * Creates a new batch.
	 *
	 * @param batch the properties of the batch
	 * @return the created batch
	 */
	insert: async (client, batch: z.infer<typeof insertBatchSchema>) => {
		const [item, err] = await ItemService.$with(client).getOne(batch.itemId);
		if (err !== null) throw err;

		const [inserted] = await client
			.insert(batchTable)
			.values({
				...batch,
				createdDate: nowIso(),
				locationId: batch.locationId ?? item.defaultLocationId,
				supplierId: batch.supplierId ?? item.defaultSupplierId,
			})
			.returning();

		if (!inserted) throw `Unknown insertion error`;
		return inserted;
	},

	/**
	 * Updates an existing batch by ID.
	 *
	 * @param id the ID of the batch to update
	 * @param partial the values to update on the batch
	 * @return the updated batch
	 */
	update: async (client, id: string, partial: z.infer<typeof updateBatchSchema>) => {
		const [updated] = await client
			.update(batchTable)
			.set(partial)
			.where(eq(batchTable.id, id))
			.returning();

		if (!updated) throw `Unable to update batch by ID "${id}"`;
		return updated;
	},

	/**
	 * Removes a batch by ID.
	 *
	 * @param id the ID of the batch to remove
	 * @return the deleted batch
	 */
	remove: async (client, id: string) => {
		const [deleted] = await client.delete(batchTable).where(eq(batchTable.id, id)).returning();
		if (!deleted) throw `Unable to delete batch by ID "${id}"`;
		return deleted;
	},

	/**
	 * Returns a batch by ID.
	 *
	 * @param id the ID of the batch to retrieve
	 * @return the batch
	 */
	getOne: async (client, id: string) => {
		return await client.query.batchTable.findFirst({
			where: (batch, { eq }) => eq(batch.id, id),
		});
	},

	/**
	 * Returns all batches for an item.
	 *
	 * @param itemId the ID of the item to get batches for
	 * @param orderBy the structure to order by
	 * @param where a where statement to include in the query
	 */
	_getAllByItem: async (
		client,
		itemId: string,
		orderBy?: OrderByDefinition<DatabaseBatch>,
		where?: SQL,
	) => {
		return await client
			.select()
			.from(batchTable)
			.where(and(eq(batchTable.itemId, itemId), where))
			.orderBy(...createOrderByValue(orderBy ?? [], batchTable));
	},

	/**
	 * Returns batches for an item with support
	 * for pagination.
	 *
	 * @param itemId the ID of the item to query for
	 * @param limit the maximum amount of rows to get
	 * @param offset the amount of rows to skip, default `0`
	 * @param orderBy the structure to order by, defaults to `'createdDate'`
	 * @param where a where statement to include in the query
	 * @return all batches matching the query input
	 */
	getByItem: async (
		client,
		itemId: string,
		limit: number,
		offset: number = 0,
		orderBy: OrderByDefinition<DatabaseBatch> = 'createdDate',
		where?: SQL<unknown>,
	) => {
		return await client
			.select()
			.from(batchTable)
			.where(and(eq(batchTable.itemId, itemId), where))
			.orderBy(...createOrderByValue(orderBy, batchTable))
			.limit(limit)
			.offset(offset);
	},
});
