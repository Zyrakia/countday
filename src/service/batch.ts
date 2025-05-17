import { and, eq, SQL } from 'drizzle-orm';

import { db } from '../db/db';
import { Batch, batchTable, insertBatchSchema, updateBatchSchema } from '../db/schema';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { z } from 'zod';
import { ItemService } from './item';
import { nowIso } from '../util/now';

/**
 * Handles RUD operations for batches. Creation of batches
 * is handled in the stock service.
 */
export namespace BatchService {
	/**
	 * Creates a new batch.
	 *
	 * @param batch the properties of the batch
	 * @return the created batch, or nothing if the insert didn't occur
	 */
	export async function insert(batch: z.infer<typeof insertBatchSchema>) {
		const item = await ItemService.getOne(batch.itemId);
		if (!item) return;

		const [inserted] = await db
			.insert(batchTable)
			.values({
				...batch,
				createdDate: nowIso(),
				locationId: batch.locationId ?? item.defaultLocationId,
				supplierId: batch.supplierId ?? item.defaultSupplierId,
			})
			.returning();

		if (inserted) return inserted;
	}

	/**
	 * Updates an existing batch by ID.
	 *
	 * @param id the ID of the batch to update
	 * @param partial the values to update on the batch
	 * @return the updated batch, or nothing if the update didn't occur
	 */
	export async function update(id: string, partial: z.infer<typeof updateBatchSchema>) {
		const [updated] = await db
			.update(batchTable)
			.set(partial)
			.where(eq(batchTable.id, id))
			.returning();

		if (updated) return updated;
	}

	/**
	 * Removes a batch by ID.
	 *
	 * @param id the ID of the batch to remove
	 * @return the deleted batch, or nothing if the deletion didn't occur
	 */
	export async function remove(id: string) {
		const [deleted] = await db.delete(batchTable).where(eq(batchTable.id, id)).returning();
		if (deleted) return deleted;
	}

	/**
	 * Returns a batch by ID.
	 *
	 * @param id the ID of the batch to retrieve
	 * @return the batch, or nothing if the ID is invalid
	 */
	export async function getOne(id: string) {
		return await db.query.batchTable.findFirst({ where: (batch, { eq }) => eq(batch.id, id) });
	}

	/**
	 * Returns all batches for an item.
	 *
	 * @param itemId the ID of the item to get batches for
	 * @param orderBy the structure to order by
	 * @param where a where statement to include in the query
	 */
	export async function getAllByItem(
		itemId: string,
		orderBy?: OrderByDefinition<Batch>,
		where?: SQL,
	) {
		return await db
			.select()
			.from(batchTable)
			.where(and(eq(batchTable.itemId, itemId), where))
			.orderBy(...(orderBy ? createOrderByValue(orderBy, batchTable) : []));
	}

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
	export async function getByItem(
		itemId: string,
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<Batch> = 'createdDate',
		where?: SQL<unknown>,
	) {
		return await db
			.select()
			.from(batchTable)
			.where(and(eq(batchTable.itemId, itemId), where))
			.orderBy(...createOrderByValue(orderBy, batchTable))
			.limit(limit)
			.offset(offset);
	}
}
