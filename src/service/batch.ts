import { and, eq, SQL } from 'drizzle-orm';
import { Batch, batchTable } from '../db/schema';
import { createOrderByValue, OrderByDefinition } from '../util/order-by-build';
import { db } from '../db/db';

/**
 * Handles CRUD operations for batches.
 */
export namespace BatchService {
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
	 * @param orderBy the structure to order by, defaults to `'receivedDate'`
	 * @param where a where statement to include in the query
	 * @return all batches matching the query input
	 */
	export async function getByItem(
		itemId: string,
		limit: number,
		offset = 0,
		orderBy: OrderByDefinition<Batch> = 'receivedDate',
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
